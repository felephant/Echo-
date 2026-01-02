
import { JournalEntry, RecallItem } from '../types';
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

// --- Helper: Scan for existing dates ---
export const getJournalDates = async (handle: FileSystemDirectoryHandle): Promise<Set<string>> => {
  const dates = new Set<string>();
  // @ts-ignore
  for await (const [name, entry] of handle.entries()) {
      // Match files like 240101.md
      if (entry.kind === 'file' && name.match(/^\d{6}\.md$/)) {
           const yearStr = name.substring(0, 2);
           const monthStr = name.substring(2, 4);
           const dayStr = name.substring(4, 6);
           
           const fullYear = 2000 + parseInt(yearStr);
           const dateStr = `${fullYear}-${monthStr}-${dayStr}`;
           dates.add(dateStr);
      }
  }
  return dates;
};

// --- Helper: Search files content ---
export const searchJournalFiles = async (handle: FileSystemDirectoryHandle, keywords: string[]): Promise<RecallItem[]> => {
    const results: RecallItem[] = [];
    const limit = 20; // Hard limit to prevent browser freeze
    const keywordSet = keywords.map(k => k.toLowerCase());

    // @ts-ignore
    for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file' && name.match(/^\d{6}\.md$/)) {
             try {
                 // @ts-ignore
                 const file = await entry.getFile();
                 const text = await file.text();
                 const lowerText = text.toLowerCase();

                 // Check if any keyword matches
                 const matchedKeyword = keywordSet.find(k => lowerText.includes(k));
                 
                 if (matchedKeyword) {
                    const year = 2000 + parseInt(name.substring(0, 2));
                    const month = parseInt(name.substring(2, 4)) - 1;
                    const day = parseInt(name.substring(4, 6));
                    const dateObj = new Date(year, month, day);
                    const dateStr = format(dateObj, 'yyyy-MM-dd');

                    // Extract a relevant snippet around the keyword
                    const idx = lowerText.indexOf(matchedKeyword);
                    const snippetStart = Math.max(0, idx - 50);
                    const snippetEnd = Math.min(text.length, idx + 100);
                    let snippet = text.substring(snippetStart, snippetEnd);
                    if(snippetStart > 0) snippet = "..." + snippet;
                    if(snippetEnd < text.length) snippet = snippet + "...";

                    results.push({
                        id: name, // filename as ID
                        title: format(dateObj, 'MMM do, yyyy'),
                        snippet: snippet.replace(/\n/g, ' '),
                        fullContent: text,
                        date: dateStr,
                        type: 'journal',
                        keyword: matchedKeyword, // Group by the keyword that found it
                        relevanceScore: 1
                    });

                    if (results.length >= limit) break;
                 }
             } catch (e) {
                 console.warn(`Failed to read ${name}`, e);
             }
        }
    }
    
    // Sort by date descending
    return results.sort((a, b) => b.date.localeCompare(a.date));
};

// --- Markdown Parsing & formatting ---

const getFileName = (date: Date) => `${format(date, 'yyMMdd')}.md`;

// Parse "- HH:mm [source] Content #tags"
const parseMarkdown = (text: string, date: Date): JournalEntry[] => {
  const lines = text.split('\n');
  const entries: JournalEntry[] = [];
  
  // Regex to match standard strict format: "- 14:30 [source] Content" or "- 9:00 Content"
  const timeRegex = /^- (\d{1,2}:\d{2})(?: \[(.*?)\])? (.*)$/;
  // Regex to match generic list items: "- Content" or "* Content"
  const bulletRegex = /^[-*] (.*)$/;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 1. Try strict time match first
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
        const [_, timeStr, sourceStr, content] = timeMatch;
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        const timestamp = new Date(date);
        timestamp.setHours(hours, minutes, 0, 0);

        entries.push({
            id: `${date.getTime()}-${index}`, // Stable ID based on order
            timestamp,
            source: (sourceStr as JournalEntry['source']) || 'user',
            content: content.trim(),
            isImportant: content.includes('#important'),
            isSaved: true // Entries read from disk are always "saved"
        });
        return;
    } 

    // 2. Try generic bullet match (treat as untimed entry, default to 00:00 or similar)
    const bulletMatch = line.match(bulletRegex);
    if (bulletMatch) {
        const content = bulletMatch[1];
        const timestamp = new Date(date);
        timestamp.setHours(0, 0, 0, 0); // Default to start of day for untimed bullets

        entries.push({
            id: `${date.getTime()}-${index}`,
            timestamp,
            source: 'user',
            content: content.trim(),
            isImportant: content.includes('#important'),
            isSaved: true
        });
        return;
    }

    // 3. Fallback: Plain text line
    if (entries.length > 0 && !line.startsWith('-') && !line.startsWith('*')) {
        // Append multiline content to previous entry
        entries[entries.length - 1].content += '\n' + trimmed;
    } else {
        // Orphan text line at start of file? Create a generic entry.
        const timestamp = new Date(date);
        timestamp.setHours(0, 0, 0, 0);

        entries.push({
            id: `${date.getTime()}-${index}`,
            timestamp,
            source: 'user',
            content: trimmed,
            isImportant: trimmed.includes('#important'),
            isSaved: true
        });
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
