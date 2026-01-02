
import { JournalEntry } from '../types';
import { format } from 'date-fns';

const DB_NAME = 'EchoJournalDB';
const STORE_NAME = 'handles';
const STORE_KEY = 'journal_directory_handle';

// --- IndexedDB Helper to persist folder permission handle ---
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

// --- File System Operations ---

export const selectDirectory = async (): Promise<FileSystemDirectoryHandle | null> => {
  // @ts-ignore - TypeScript might not recognize showDirectoryPicker yet
  if (!window.showDirectoryPicker) {
      throw new Error("File System Access API not supported in this browser.");
  }

  try {
    // @ts-ignore
    const handle = await window.showDirectoryPicker({
        id: 'echo-journal-root',
        mode: 'readwrite'
    });
    await storeDirectoryHandle(handle);
    return handle;
  } catch (error) {
    // Propagate error unless it's a user cancellation
    if ((error as Error).name === 'AbortError') {
        return null;
    }
    throw error;
  }
};

export const verifyPermission = async (handle: FileSystemDirectoryHandle, readWrite: boolean = true): Promise<boolean> => {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    // @ts-ignore
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    // @ts-ignore
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
  } catch (e) {
      console.error("Permission check failed", e);
      return false;
  }
};

// --- Markdown Parsing & formatting ---

const getFileName = (date: Date) => `${format(date, 'yyMMdd')}.md`;

// Parse "- HH:mm [source] Content #tags"
const parseMarkdown = (text: string, date: Date): JournalEntry[] => {
  const lines = text.split('\n');
  const entries: JournalEntry[] = [];
  
  const entryRegex = /^- (\d{2}:\d{2})(?: \[(.*?)\])? (.*)$/;

  lines.forEach((line, index) => {
    const match = line.match(entryRegex);
    if (match) {
        const [_, timeStr, sourceStr, content] = match;
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        const timestamp = new Date(date);
        timestamp.setHours(hours, minutes, 0, 0);

        const isImportant = content.includes('#important');
        
        entries.push({
            id: `${date.getTime()}-${index}`, // Stable ID based on order
            timestamp,
            source: (sourceStr as JournalEntry['source']) || 'user',
            content: content.trim(),
            isImportant,
            isSaved: true // Entries read from disk are always "saved"
        });
    } else if (line.trim() && entries.length > 0 && !line.startsWith('-')) {
        // Append multiline content
        entries[entries.length - 1].content += '\n' + line.trim();
    }
  });

  return entries;
};

const formatEntry = (entry: JournalEntry): string => {
  const timeStr = format(entry.timestamp, 'HH:mm');
  const sourceTag = entry.source && entry.source !== 'user' ? ` [${entry.source}]` : '';
  const importantTag = entry.isImportant && !entry.content.includes('#important') ? ' #important' : '';
  // Ensure multiline content is indented or handled if necessary, but standard markdown list just needs the first line bulleted
  return `- ${timeStr}${sourceTag} ${entry.content}${importantTag}`;
};

// --- CRUD ---

export const readDailyJournal = async (handle: FileSystemDirectoryHandle, date: Date): Promise<JournalEntry[]> => {
    try {
        const fileName = getFileName(date);
        const fileHandle = await handle.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return parseMarkdown(text, date);
    } catch (error) {
        // File likely doesn't exist, return empty
        return [];
    }
};

export const appendToJournal = async (handle: FileSystemDirectoryHandle, date: Date, entry: JournalEntry) => {
    const fileName = getFileName(date);
    
    // 1. Get or Create File Handle
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    
    // 2. Read existing content to safe-append
    let currentContent = "";
    try {
        const file = await fileHandle.getFile();
        currentContent = await file.text();
    } catch (e) {
        // File might be new
    }

    // 3. Prepare new content
    const entryText = formatEntry(entry);
    const separator = currentContent.length > 0 && !currentContent.endsWith('\n') ? '\n' : '';
    const newContent = currentContent + separator + entryText + '\n';

    // 4. Write full content (Read-Modify-Write pattern is safer than append stream for simple usage)
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(newContent);
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
    await writable.write(fullText + '\n');
    await writable.close();
};
