
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
  // @ts-ignore - File System Access API
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
    if ((error as Error).name === 'AbortError') return null;
    throw error;
  }
};

export const verifyPermission = async (handle: FileSystemDirectoryHandle, readWrite: boolean = true): Promise<boolean> => {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    // @ts-ignore
    if ((await handle.queryPermission(options)) === 'granted') return true;
    // @ts-ignore
    if ((await handle.requestPermission(options)) === 'granted') return true;
    return false;
  } catch (e) {
      console.error("Permission check failed", e);
      return false;
  }
};

// --- Helpers ---

const getFileName = (date: Date) => `${format(date, 'yyMMdd')}.md`;

const formatEntry = (entry: JournalEntry): string => {
  const sourceTag = entry.source && entry.source !== 'user' ? ` [${entry.source}]` : '';
  const importantTag = entry.isImportant && !entry.content.includes('#important') ? ' #important' : '';
  
  if (entry.hasTime === false) {
      return `- ${entry.content}${importantTag}`;
  }
  
  const timeStr = format(entry.timestamp, 'HH:mm');
  return `- ${timeStr}${sourceTag} ${entry.content}${importantTag}`;
};

const parseMarkdown = (text: string, date: Date): JournalEntry[] => {
  const lines = text.split('\n');
  const entries: JournalEntry[] = [];
  
  const timeRegex = /^- (\d{1,2}:\d{2})(?: \[(.*?)\])? (.*)$/;
  const bulletRegex = /^[-*] (.*)$/;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
        const [_, timeStr, sourceStr, content] = timeMatch;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const timestamp = new Date(date);
        timestamp.setHours(hours, minutes, 0, 0);

        entries.push({
            id: `${date.getTime()}-${index}`,
            timestamp,
            hasTime: true,
            source: (sourceStr as JournalEntry['source']) || 'user',
            content: content.trim(),
            isImportant: content.includes('#important'),
            isSaved: true
        });
        return;
    } 

    const bulletMatch = line.match(bulletRegex);
    if (bulletMatch) {
        const content = bulletMatch[1];
        const timestamp = new Date(date);
        timestamp.setHours(0, 0, 0, 0);

        entries.push({
            id: `${date.getTime()}-${index}`,
            timestamp,
            hasTime: false,
            source: 'user',
            content: content.trim(),
            isImportant: content.includes('#important'),
            isSaved: true
        });
        return;
    }

    if (entries.length > 0 && !line.startsWith('-') && !line.startsWith('*')) {
        entries[entries.length - 1].content += '\n' + trimmed;
    } else {
        const timestamp = new Date(date);
        timestamp.setHours(0, 0, 0, 0);

        entries.push({
            id: `${date.getTime()}-${index}`,
            timestamp,
            hasTime: false,
            source: 'user',
            content: trimmed,
            isImportant: trimmed.includes('#important'),
            isSaved: true
        });
    }
  });

  return entries;
};

// --- CRUD Operations ---

export const getJournalDates = async (handle: FileSystemDirectoryHandle): Promise<Set<string>> => {
  const dates = new Set<string>();
  // @ts-ignore
  for await (const [name, entry] of handle.entries()) {
      if (entry.kind === 'file' && name.match(/^\d{6}\.md$/)) {
           const year = 2000 + parseInt(name.substring(0, 2));
           const month = name.substring(2, 4);
           const day = name.substring(4, 6);
           dates.add(`${year}-${month}-${day}`);
      }
  }
  return dates;
};

export const searchJournalFiles = async (handle: FileSystemDirectoryHandle, keywords: string[], excludeDate?: Date): Promise<RecallItem[]> => {
    const results: RecallItem[] = [];
    const limit = 50;
    const keywordSet = keywords.map(k => k.toLowerCase());
    const excludeFileName = excludeDate ? getFileName(excludeDate) : null;

    // @ts-ignore
    for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file' && name.match(/^\d{6}\.md$/)) {
             if (excludeFileName && name === excludeFileName) continue;

             try {
                 // @ts-ignore
                 const file = await entry.getFile();
                 const text = await file.text();

                 const year = 2000 + parseInt(name.substring(0, 2));
                 const month = parseInt(name.substring(2, 4)) - 1;
                 const day = parseInt(name.substring(4, 6));
                 const dateObj = new Date(year, month, day);
                 
                 const parsedEntries = parseMarkdown(text, dateObj);

                 for (const journalEntry of parsedEntries) {
                    const lowerContent = journalEntry.content.toLowerCase();
                    const matchedKeywords = keywordSet.filter(k => lowerContent.includes(k));
                    
                    if (matchedKeywords.length > 0) {
                        let snippet = journalEntry.content;
                        if (snippet.length > 150) snippet = snippet.substring(0, 150) + "...";
                        const primaryKeyword = matchedKeywords.sort((a,b) => b.length - a.length)[0];

                        results.push({
                            id: `${name}-${journalEntry.id}`,
                            title: format(dateObj, 'MMM do, yyyy'),
                            snippet: snippet,
                            fullContent: journalEntry.content,
                            date: format(dateObj, 'yyyy-MM-dd'),
                            type: 'journal',
                            keyword: primaryKeyword, 
                            relevanceScore: matchedKeywords.length
                        });
                    }
                 }
                 if (results.length >= limit) break;
             } catch (e) {
                 console.warn(`Failed to read/parse ${name}`, e);
             }
        }
    }
    
    return results.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
        return b.date.localeCompare(a.date);
    });
};

export const readDailyJournal = async (handle: FileSystemDirectoryHandle, date: Date): Promise<JournalEntry[]> => {
    try {
        const fileName = getFileName(date);
        const fileHandle = await handle.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return parseMarkdown(text, date);
    } catch {
        return [];
    }
};

export const appendToJournal = async (handle: FileSystemDirectoryHandle, date: Date, entry: JournalEntry) => {
    const fileName = getFileName(date);
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    
    let currentContent = "";
    try {
        const file = await fileHandle.getFile();
        currentContent = await file.text();
    } catch {}

    const entryText = formatEntry(entry);
    const separator = currentContent.length > 0 && !currentContent.endsWith('\n') ? '\n' : '';
    const newContent = currentContent + separator + entryText + '\n';

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
