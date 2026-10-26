import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedChunk {
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  timestamp?: string;
  heading?: string;
}

export interface ExtractedDocument {
  text: string;
  pageCount?: number;
  chunks: ExtractedChunk[];
  wordCount: number;
}

/**
 * Split text into overlapping chunks while preserving boundaries
 */
export function chunkText(text: string, chunkSize = 800, overlap = 150): ExtractedChunk[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\s*\n/);
  const chunks: ExtractedChunk[] = [];
  let currentChunk = '';
  let chunkIdx = 0;

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if ((currentChunk.length + trimmedPara.length) < chunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    } else {
      if (currentChunk) {
        chunks.push({
          chunkIndex: chunkIdx++,
          content: currentChunk.trim(),
        });
      }
      // Overlap by taking last few words or starting new
      if (trimmedPara.length > chunkSize) {
        // Break long paragraph into sentence/word pieces
        const sentences = trimmedPara.split(/(?<=[.?!])\s+/);
        let subChunk = '';
        for (const sent of sentences) {
          if ((subChunk.length + sent.length) < chunkSize) {
            subChunk += (subChunk ? ' ' : '') + sent;
          } else {
            if (subChunk) {
              chunks.push({
                chunkIndex: chunkIdx++,
                content: subChunk.trim(),
              });
            }
            subChunk = sent;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = trimmedPara;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      chunkIndex: chunkIdx++,
      content: currentChunk.trim(),
    });
  }

  return chunks;
}

function extractRawPdfStrings(buffer: Buffer): string {
  try {
    const str = buffer.toString('latin1');
    const textPieces: string[] = [];
    const regex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      const clean = match[1].replace(/\\([()\\])/g, '$1').trim();
      if (clean.length > 1) {
        textPieces.push(clean);
      }
    }
    return textPieces.join(' ');
  } catch {
    return '';
  }
}

/**
 * Extract text and page boundaries from PDF Buffer
 */
export async function parsePdf(buffer: Buffer): Promise<ExtractedDocument> {
  let fullText = '';
  let pages: any[] = [];

  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    pages = result.pages || [];
    fullText = result.text || '';
    await parser.destroy();
  } catch (pdfErr: any) {
    console.warn('PDFParse standard extractor threw, using stream recovery:', pdfErr?.message);
    fullText = extractRawPdfStrings(buffer);
  }

  const chunks: ExtractedChunk[] = [];
  let chunkIndex = 0;

  if (pages.length > 0) {
    for (const page of pages) {
      const pageText = page.text || '';
      if (!pageText.trim()) continue;
      const pageChunks = chunkText(pageText, 700, 100);
      for (const c of pageChunks) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: c.content,
          pageNumber: page.num,
        });
      }
    }
  }

  if (chunks.length === 0 && fullText.trim()) {
    const fallbackChunks = chunkText(fullText, 700, 100);
    chunks.push(...fallbackChunks);
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  return {
    text: fullText,
    pageCount: pages.length || 1,
    chunks,
    wordCount,
  };
}

/**
 * Extract text from DOCX Buffer
 */
export async function parseDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value || '';
  const chunks = chunkText(text, 700, 100);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    chunks,
    wordCount,
  };
}

/**
 * Extract text from plain text or Markdown
 */
export function parsePlainText(content: string): ExtractedDocument {
  const chunks = chunkText(content, 700, 100);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    text: content,
    chunks,
    wordCount,
  };
}

/**
 * Extract YouTube transcript with timestamps
 */
export async function parseYouTubeVideo(url: string): Promise<ExtractedDocument & { title: string; videoId: string }> {
  // Extract video ID from youtube url formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[2].length === 11 ? match[2] : null;

  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid YouTube link (e.g., https://www.youtube.com/watch?v=VIDEO_ID).');
  }

  try {
    const videoPageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!videoPageRes.ok) {
      throw new Error(`Failed to access YouTube video (status ${videoPageRes.status}). The video may be private or restricted.`);
    }

    const html = await videoPageRes.text();

    // Extract title
    let title = 'YouTube Lecture / Video';
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(' - YouTube', '').trim();
    }

    // Extract caption track from ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!playerResponseMatch) {
      throw new Error('Could not parse YouTube player metadata. The video might be private, age-restricted, or removed.');
    }

    let playerResponse: any;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch {
      throw new Error('Could not parse YouTube player response. Please try another video or upload a transcript file.');
    }

    // Check playability
    const playabilityStatus = playerResponse?.playabilityStatus?.status;
    if (playabilityStatus && playabilityStatus !== 'OK') {
      const reason = playerResponse?.playabilityStatus?.reason || 'Video is not playable or is restricted';
      throw new Error(`YouTube video restricted: ${reason}`);
    }

    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error('No closed captions or transcript are available for this video. YouTube requires uploaded or auto-generated captions to extract notes.');
    }

    // Find English or first available caption track
    const selectedTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('en')) || captionTracks[0];
    const transcriptUrl = selectedTrack.baseUrl;

    if (!transcriptUrl) {
      throw new Error('Caption track stream URL was unavailable. YouTube might require authentication for this caption track.');
    }

    const transcriptRes = await fetch(transcriptUrl);
    if (!transcriptRes.ok) {
      throw new Error('Failed to retrieve caption stream from YouTube.');
    }

    const transcriptXml = await transcriptRes.text();

    // Parse XML tags: <text start="12.34" dur="4.56">caption text</text>
    const regex = /<text start="([\d\.]+)" dur="([\d\.]+)">(.*?)<\/text>/g;
    let xmlMatch;
    const lines: { start: number; timestamp: string; text: string }[] = [];

    while ((xmlMatch = regex.exec(transcriptXml)) !== null) {
      const startSec = parseFloat(xmlMatch[1]);
      const minutes = Math.floor(startSec / 60);
      const seconds = Math.floor(startSec % 60);
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // decode HTML entities
      const text = xmlMatch[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      if (text) {
        lines.push({ start: startSec, timestamp, text });
      }
    }

    if (lines.length === 0) {
      throw new Error('The caption track was empty. No readable subtitles found.');
    }

    // Group captions into 1-2 minute chunks
    const chunks: ExtractedChunk[] = [];
    let currentChunkText = '';
    let currentTimestamp = lines[0].timestamp;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentChunkText += (currentChunkText ? ' ' : '') + line.text;

      // Group every ~120 words or 60 seconds
      if (currentChunkText.split(/\s+/).length >= 100 || i === lines.length - 1) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: currentChunkText.trim(),
          timestamp: currentTimestamp,
        });
        currentChunkText = '';
        if (i + 1 < lines.length) {
          currentTimestamp = lines[i + 1].timestamp;
        }
      }
    }

    const fullTranscriptText = lines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
    const wordCount = fullTranscriptText.split(/\s+/).filter(Boolean).length;

    return {
      title,
      videoId,
      text: fullTranscriptText,
      chunks,
      wordCount,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to process YouTube video transcript.');
  }
}
