import { JournalEntry } from '../types';
import { format, parse } from 'date-fns';

const DB_NAME = 'EchoJournalDB';
const STORE_NAME = 'handles';
const STORE_KEY = 'journal_directory_handle';

// --- IndexedDB Helper ---
const getDb = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
};

export const storeDirectoryHandle = async (handle: FileSystemDirectoryHandle) => {
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, STORE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getStoredDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STORE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// --- File System Logic ---

export const selectDirectory = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    // @ts-ignore - Trigger browser picker
    const handle = await window.showDirectoryPicker({
        id: 'journal-root',
        mode: 'readwrite'
    });
    await storeDirectoryHandle(handle);
    return handle;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
        console.error("Error selecting directory:", error);
    }
    return null;
  }
};

export const verifyPermission = async (handle: FileSystemDirectoryHandle, readWrite: boolean = true): Promise<boolean> => {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  // @ts-ignore
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  // @ts-ignore
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
};

// --- Parsing & Formatting ---

const getFileName = (date: Date) => `${format(date, 'yyMMdd')}.md`;

const parseMarkdown = (text: string, date: Date): JournalEntry[] => {
  const lines = text.split('\n');
  const entries: JournalEntry[] = [];
  
  // Regex to match: "- 14:30 [source] Content" or "- 14:30 Content"
  const entryRegex = /^- (\d{2}:\d{2})(?: \[(.*?)\])? (.*)$/;

  lines.forEach((line, index) => {
    const match = line.match(entryRegex);
    if (match) {
        const [_, timeStr, sourceStr, content] = match;
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        const timestamp = new Date(date);
        timestamp.setHours(hours, minutes, 0, 0);

        entries.push({
            id: `${date.getTime()}-${index}`, // Stable-ish ID based on order
            timestamp,
            source: (sourceStr as JournalEntry['source']) || 'user',
            content: content.trim(),
            isImportant: content.includes('#star') || content.includes('#important'),
            isSaved: true
        });
    } else if (line.trim() && entries.length > 0) {
        // Append multiline content to previous entry
        entries[entries.length - 1].content += '\n' + line.trim();
    }
  });

  return entries;
};

const formatEntry = (entry: JournalEntry): string => {
  const timeStr = format(entry.timestamp, 'HH:mm');
  const sourceTag = entry.source && entry.source !== 'user' ? ` [${entry.source}]` : '';
  const starTag = entry.isImportant ? ' #important' : '';
  // Clean newlines to match indented list style if needed, but for now keep it simple
  return `- ${timeStr}${sourceTag} ${entry.content}${starTag}`;
};

// --- CRUD Operations ---

export const readDailyJournal = async (handle: FileSystemDirectoryHandle, date: Date): Promise<JournalEntry[]> => {
    try {
        const fileName = getFileName(date);
        const fileHandle = await handle.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return parseMarkdown(text, date);
    } catch (error) {
        // File doesn't exist yet, which is fine
        return [];
    }
};

export const appendToJournal = async (handle: FileSystemDirectoryHandle, date: Date, entry: JournalEntry) => {
    const fileName = getFileName(date);
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    
    // Create a writable stream
    // @ts-ignore
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    
    // Get current file size to append to end
    const file = await fileHandle.getFile();
    const currentText = await file.text();
    
    const newBlock = formatEntry(entry);
    const prefix = currentText.length > 0 && !currentText.endsWith('\n') ? '\n' : '';
    
    // @ts-ignore
    await writable.write({ type: 'write', position: file.size, data: prefix + newBlock + '\n' });
    // @ts-ignore
    await writable.close();
};

export const rewriteJournal = async (handle: FileSystemDirectoryHandle, date: Date, entries: JournalEntry[]) => {
    const fileName = getFileName(date);
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    
    const fullText = entries
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(formatEntry)
        .join('\n');

    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(fullText);
    await writable.close();
};

export const searchAllJournals = async (handle: FileSystemDirectoryHandle, query: string): Promise<any[]> => {
    const results = [];
    // @ts-ignore
    for await (const [name, entry] of handle.entries()) {
        if (name.endsWith('.md') && entry.kind === 'file') {
             const fileHandle = entry as FileSystemFileHandle;
             const file = await fileHandle.getFile();
             const text = await file.text();
             if (text.toLowerCase().includes(query.toLowerCase())) {
                 // Simple hit
                 results.push({
                     id: name,
                     title: name.replace('.md', ''),
                     snippet: text.substring(0, 100) + '...',
                     date: '20' + name.replace('.md', '').replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3'), // rough parse
                     type: 'journal',
                     relevanceScore: 1
                 });
             }
        }
    }
    return results;
};
