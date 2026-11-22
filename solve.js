// A fast csv-reader 1.0.0-compatible parser.
//
// Returns exactly what make.fun's csv-reader 1.0.0 returns for every input
// {text, header}: {columns, rows, errors}, with csv-reader's broken-row policy
// (see the kit's RULES.txt and the reference in the house baseline). It reads
// the text once, left to right, but with bulk scans instead of one character
// at a time: an unquoted field ends at the next comma / LF / CR found by one
// native scan, a quoted field jumps from quote to quote, and only a segment
// that holds a line break pays for line counting or CR normalisation. Every
// error is reported in the same order, with the same line and row, as the
// reference. Pure: no state is kept between calls.

const DELIM = /[,\r\n]/g;
const HAS_BREAK = /[\r\n]/;
const BREAKS = /\r\n?|\n/g;

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it
  // takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // A stretch of a quoted field, text[a..b): each CRLF or lone CR inside it
  // is read as one LF, and counts one line; anything else stands as it is.
  function segment(a, b) {
    if (b <= a) return '';
    const seg = text.slice(a, b);
    if (!HAS_BREAK.test(seg)) return seg;
    const breaks = seg.match(BREAKS);
    line += breaks.length;
    return seg.indexOf('\r') === -1 ? seg : seg.replace(/\r\n?/g, '\n');
  }

  // Unquoted characters from pos onto `init`, up to the next comma or line
  // break: a CR not followed by LF is dropped (stray_cr). Returns the field,
  // how it ended, and how many characters were kept (for quote_junk).
  function readUnquoted(init) {
    let parts = null; // kept stretches split by a dropped stray CR
    let kept = 0;
    let segStart = pos;
    for (;;) {
      DELIM.lastIndex = pos;
      const m = DELIM.exec(text);
      if (m === null) {
        const tail = text.slice(segStart);
        kept += tail.length;
        pos = n;
        return {
          value: parts === null ? init + tail : init + parts.join('') + tail,
          ended: END,
          added: kept,
        };
      }
      const i = m.index;
      const c = text.charCodeAt(i);
      if (c === 44) {
        // ','
        const seg = text.slice(segStart, i);
        kept += seg.length;
        pos = i + 1;
        return {
          value: parts === null ? init + seg : init + parts.join('') + seg,
          ended: COMMA,
          added: kept,
        };
      }
      if (c === 10) {
        // LF
        const seg = text.slice(segStart, i);
        kept += seg.length;
        pos = i + 1;
        line += 1;
        return {
          value: parts === null ? init + seg : init + parts.join('') + seg,
          ended: LINE_BREAK,
          added: kept,
        };
      }
      if (text.charCodeAt(i + 1) === 10) {
        // CRLF
        const seg = text.slice(segStart, i);
        kept += seg.length;
        pos = i + 2;
        line += 1;
        return {
          value: parts === null ? init + seg : init + parts.join('') + seg,
          ended: LINE_BREAK,
          added: kept,
        };
      }
      // A lone CR: dropped, and the field goes on after it.
      const seg = text.slice(segStart, i);
      kept += seg.length;
      if (parts === null) parts = [];
      parts.push(seg);
      error('stray_cr');
      pos = i + 1;
      segStart = pos;
    }
  }

  // A quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    let segStart = pos + 1;
    let scan = pos + 1;
    for (;;) {
      const q = text.indexOf('"', scan);
      if (q === -1) {
        // The quote never closes: it is a literal character, and the text
        // after it is read again as an unquoted field.
        pos = open + 1;
        line = openLine;
        error('unterminated_quote');
        return readUnquoted('"');
      }
      if (text.charCodeAt(q + 1) === 34) {
        // A doubled quote is one quote inside the field.
        value += segment(segStart, q);
        value += '"';
        scan = q + 2;
        segStart = q + 2;
        continue;
      }
      value += segment(segStart, q);
      pos = q + 1;
      break;
    }
    if (pos >= n) return { value, ended: END };
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      return { value, ended: COMMA };
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    // What follows the closing quote is appended as it stands, up to the
    // next comma or line break.
    const junk = readUnquoted(value);
    if (junk.added > 0) error('quote_junk');
    return junk;
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    let ended = COMMA;
    do {
      quoted = text.charCodeAt(pos) === 34;
      const field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
      ended = field.ended;
    } while (ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  return { columns: header ? (columns ?? []) : null, rows, errors };
}
