import {
  BlockType,
  type DocxBlock,
  type DocxDocument,
  type BlockText,
  type TextElement,
  type TextRun,
  type BlockImage,
  type BlockTable,
} from "./types";
import { unescapeURL } from "./url-utils";

// Code language mapping (Feishu API integer → markdown language string)
const CODE_LANG_MAP: Record<number, string> = {
  1: "",            // PlainText
  2: "abap",
  3: "ada",
  4: "apache",
  5: "apex",
  6: "assembly",
  7: "bash",
  8: "csharp",
  9: "cpp",
  10: "c",
  11: "cobol",
  12: "css",
  13: "coffeescript",
  14: "d",
  15: "dart",
  16: "delphi",
  17: "django",
  18: "dockerfile",
  19: "erlang",
  20: "fortran",
  21: "foxpro",
  22: "go",
  23: "groovy",
  24: "html",
  25: "htmlbars",
  26: "http",
  27: "haskell",
  28: "json",
  29: "java",
  30: "javascript",
  31: "julia",
  32: "kotlin",
  33: "latex",
  34: "lisp",
  35: "logo",
  36: "lua",
  37: "matlab",
  38: "makefile",
  39: "markdown",
  40: "nginx",
  41: "objectivec",
  42: "openedge-abl",
  43: "php",
  44: "perl",
  45: "postscript",
  46: "powershell",
  47: "prolog",
  48: "protobuf",
  49: "python",
  50: "r",
  51: "rpg",
  52: "ruby",
  53: "rust",
  54: "sas",
  55: "scss",
  56: "sql",
  57: "scala",
  58: "scheme",
  59: "scratch",
  60: "shell",
  61: "swift",
  62: "thrift",
  63: "typescript",
  64: "vbscript",
  65: "vbnet",
  66: "xml",
  67: "yaml",
};

export class Parser {
  private imgTokens: string[] = [];
  private blockMap: Map<string, DocxBlock> = new Map();

  get imageTokens(): string[] {
    return this.imgTokens;
  }

  parseDocxContent(doc: DocxDocument, blocks: DocxBlock[]): string {
    for (const block of blocks) {
      this.blockMap.set(block.block_id, block);
    }

    const entryBlock = this.blockMap.get(doc.document_id);
    if (!entryBlock) return "";

    return this.parseDocxBlock(entryBlock, 0);
  }

  parseDocxBlock(b: DocxBlock, indentLevel: number): string {
    let result = "\t".repeat(indentLevel);

    switch (b.block_type) {
      case BlockType.Page:
        result += this.parseBlockPage(b);
        break;
      case BlockType.Text:
        result += this.parseBlockText(b.text);
        break;
      case BlockType.Callout:
        result += this.parseBlockCallout(b);
        break;
      case BlockType.Heading1:
        result += this.parseBlockHeading(b, 1);
        break;
      case BlockType.Heading2:
        result += this.parseBlockHeading(b, 2);
        break;
      case BlockType.Heading3:
        result += this.parseBlockHeading(b, 3);
        break;
      case BlockType.Heading4:
        result += this.parseBlockHeading(b, 4);
        break;
      case BlockType.Heading5:
        result += this.parseBlockHeading(b, 5);
        break;
      case BlockType.Heading6:
        result += this.parseBlockHeading(b, 6);
        break;
      case BlockType.Heading7:
        result += this.parseBlockHeading(b, 7);
        break;
      case BlockType.Heading8:
        result += this.parseBlockHeading(b, 8);
        break;
      case BlockType.Heading9:
        result += this.parseBlockHeading(b, 9);
        break;
      case BlockType.Bullet:
        result += this.parseBlockBullet(b, indentLevel);
        break;
      case BlockType.Ordered:
        result += this.parseBlockOrdered(b, indentLevel);
        break;
      case BlockType.Code:
        result += this.parseBlockCode(b);
        break;
      case BlockType.Quote:
        result += "> " + this.parseBlockText(b.quote);
        break;
      case BlockType.Equation:
        result += "$$\n" + this.parseBlockText(b.equation) + "$$\n";
        break;
      case BlockType.Todo:
        result += this.parseBlockTodo(b);
        break;
      case BlockType.Divider:
        result += "---\n";
        break;
      case BlockType.Image:
        result += this.parseBlockImage(b.image);
        break;
      case BlockType.TableCell:
        result += this.parseBlockTableCell(b);
        break;
      case BlockType.Table:
        result += this.parseBlockTable(b.table);
        break;
      case BlockType.QuoteContainer:
        result += this.parseBlockQuoteContainer(b);
        break;
      case BlockType.Grid:
        result += this.parseBlockGrid(b, indentLevel);
        break;
      default:
        break;
    }

    return result;
  }

  private parseBlockPage(b: DocxBlock): string {
    let result = "# " + this.parseBlockText(b.page) + "\n";

    for (const childId of b.children ?? []) {
      const childBlock = this.blockMap.get(childId);
      if (childBlock) {
        result += this.parseDocxBlock(childBlock, 0) + "\n";
      }
    }

    return result;
  }

  private parseBlockText(bt: BlockText | undefined): string {
    if (!bt) return "\n";

    let result = "";
    const numElem = bt.elements.length;

    for (const e of bt.elements) {
      const inline = numElem > 1;
      result += this.parseTextElement(e, inline);
    }

    result += "\n";
    return result;
  }

  private parseBlockCallout(b: DocxBlock): string {
    let result = ">[!TIP] \n";

    for (const childId of b.children ?? []) {
      const childBlock = this.blockMap.get(childId);
      if (childBlock) {
        result += this.parseDocxBlock(childBlock, 0);
      }
    }

    return result;
  }

  private parseTextElement(e: TextElement, inline: boolean): string {
    let result = "";

    if (e.text_run) {
      result += this.parseTextRun(e.text_run);
    }
    if (e.mention_user) {
      result += e.mention_user.user_id;
    }
    if (e.mention_doc) {
      const title = e.mention_doc.title ?? "";
      const url = e.mention_doc.url ? unescapeURL(e.mention_doc.url) : "";
      result += `[${title}](${url})`;
    }
    if (e.equation) {
      const symbol = inline ? "$" : "$$";
      const content = e.equation.content.replace(/\n$/, "");
      result += symbol + content + symbol;
    }

    return result;
  }

  private parseTextRun(tr: TextRun): string {
    let prefix = "";
    let suffix = "";

    const style = tr.text_element_style;
    if (style) {
      if (style.bold) {
        prefix = "**";
        suffix = "**";
      } else if (style.italic) {
        prefix = "_";
        suffix = "_";
      } else if (style.strikethrough) {
        prefix = "~~";
        suffix = "~~";
      } else if (style.underline) {
        prefix = "<u>";
        suffix = "</u>";
      } else if (style.inline_code) {
        prefix = "`";
        suffix = "`";
      } else if (style.link) {
        prefix = "[";
        suffix = `](${unescapeURL(style.link.url)})`;
      }
    }

    return prefix + tr.content + suffix;
  }

  private parseBlockHeading(b: DocxBlock, level: number): string {
    const headingKey = `heading${level}` as keyof DocxBlock;
    const headingData = b[headingKey] as BlockText | undefined;

    let result = "#".repeat(level) + " " + this.parseBlockText(headingData);

    for (const childId of b.children ?? []) {
      const childBlock = this.blockMap.get(childId);
      if (childBlock) {
        result += this.parseDocxBlock(childBlock, 0);
      }
    }

    return result;
  }

  private parseBlockBullet(b: DocxBlock, indentLevel: number): string {
    let result = "- " + this.parseBlockText(b.bullet);

    for (const childId of b.children ?? []) {
      const childBlock = this.blockMap.get(childId);
      if (childBlock) {
        result += this.parseDocxBlock(childBlock, indentLevel + 1);
      }
    }

    return result;
  }

  private parseBlockOrdered(b: DocxBlock, indentLevel: number): string {
    // Calculate order number by counting consecutive ordered siblings before this block
    const parent = b.parent_id ? this.blockMap.get(b.parent_id) : undefined;
    let order = 1;

    if (parent?.children) {
      for (let idx = 0; idx < parent.children.length; idx++) {
        if (parent.children[idx] === b.block_id) {
          for (let i = idx - 1; i >= 0; i--) {
            const sibling = this.blockMap.get(parent.children[i]);
            if (sibling?.block_type === BlockType.Ordered) {
              order++;
            } else {
              break;
            }
          }
          break;
        }
      }
    }

    let result = `${order}. ` + this.parseBlockText(b.ordered);

    for (const childId of b.children ?? []) {
      const childBlock = this.blockMap.get(childId);
      if (childBlock) {
        result += this.parseDocxBlock(childBlock, indentLevel + 1);
      }
    }

    return result;
  }

  private parseBlockCode(b: DocxBlock): string {
    const lang = CODE_LANG_MAP[b.code?.style?.language ?? 1] ?? "";
    const content = this.parseBlockText(b.code).trim();
    return "```" + lang + "\n" + content + "\n```\n";
  }

  private parseBlockTodo(b: DocxBlock): string {
    const done = b.todo?.style?.done ?? false;
    const checkbox = done ? "- [x] " : "- [ ] ";
    return checkbox + this.parseBlockText(b.todo);
  }

  private parseBlockImage(img: BlockImage | undefined): string {
    if (!img) return "";
    this.imgTokens.push(img.token);
    return `![](${img.token})\n`;
  }

  private parseBlockTableCell(b: DocxBlock): string {
    let result = "";

    for (const childId of b.children ?? []) {
      const childBlock = this.blockMap.get(childId);
      if (childBlock) {
        const content = this.parseDocxBlock(childBlock, 0);
        result += content + "<br/>";
      }
    }

    return result;
  }

  private parseBlockTable(t: BlockTable | undefined): string {
    if (!t) return "";

    const rows: string[][] = [];
    const mergeInfoMap: Map<string, { row_span: number; col_span: number }> =
      new Map();

    // Build merge info map
    if (t.property.merge_info) {
      for (let i = 0; i < t.property.merge_info.length; i++) {
        const merge = t.property.merge_info[i];
        const rowIndex = Math.floor(i / t.property.column_size);
        const colIndex = i % t.property.column_size;
        mergeInfoMap.set(`${rowIndex}-${colIndex}`, merge);
      }
    }

    // Build table content
    for (let i = 0; i < t.cells.length; i++) {
      const blockId = t.cells[i];
      const block = this.blockMap.get(blockId);
      let cellContent = block ? this.parseDocxBlock(block, 0) : "";
      cellContent = cellContent.replace(/\n/g, "");

      const rowIndex = Math.floor(i / t.property.column_size);
      const colIndex = i % t.property.column_size;

      // Ensure row exists
      while (rows.length <= rowIndex) {
        rows.push([]);
      }
      while (rows[rowIndex].length <= colIndex) {
        rows[rowIndex].push("");
      }

      rows[rowIndex][colIndex] = cellContent;
    }

    // Render as HTML table
    let result = "<table>\n";
    const processedCells = new Set<string>();

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      result += "<tr>\n";
      for (let colIndex = 0; colIndex < rows[rowIndex].length; colIndex++) {
        const cellKey = `${rowIndex}-${colIndex}`;

        if (processedCells.has(cellKey)) {
          continue;
        }

        const cellContent = rows[rowIndex][colIndex];
        const mergeInfo = mergeInfoMap.get(cellKey);

        if (mergeInfo) {
          let attributes = "";
          if (mergeInfo.row_span > 1) {
            attributes += ` rowspan="${mergeInfo.row_span}"`;
          }
          if (mergeInfo.col_span > 1) {
            attributes += ` colspan="${mergeInfo.col_span}"`;
          }
          result += `<td${attributes}>${cellContent}</td>`;

          // Mark merged cells as processed
          for (let r = rowIndex; r < rowIndex + mergeInfo.row_span; r++) {
            for (let c = colIndex; c < colIndex + mergeInfo.col_span; c++) {
              processedCells.add(`${r}-${c}`);
            }
          }
        } else {
          result += `<td>${cellContent}</td>`;
        }
      }
      result += "</tr>\n";
    }

    result += "</table>\n";
    return result;
  }

  private parseBlockQuoteContainer(b: DocxBlock): string {
    let result = "";

    for (const childId of b.children ?? []) {
      const childBlock = this.blockMap.get(childId);
      if (childBlock) {
        result += "> " + this.parseDocxBlock(childBlock, 0);
      }
    }

    return result;
  }

  private parseBlockGrid(b: DocxBlock, indentLevel: number): string {
    let result = "";

    for (const childId of b.children ?? []) {
      const columnBlock = this.blockMap.get(childId);
      if (columnBlock) {
        for (const grandchildId of columnBlock.children ?? []) {
          const block = this.blockMap.get(grandchildId);
          if (block) {
            result += this.parseDocxBlock(block, indentLevel);
          }
        }
      }
    }

    return result;
  }
}
