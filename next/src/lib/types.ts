export const BlockType = {
  Page: 1,
  Text: 2,
  Heading1: 3,
  Heading2: 4,
  Heading3: 5,
  Heading4: 6,
  Heading5: 7,
  Heading6: 8,
  Heading7: 9,
  Heading8: 10,
  Heading9: 11,
  Bullet: 12,
  Ordered: 13,
  Code: 14,
  Quote: 15,
  Equation: 16,
  Todo: 17,
  Callout: 19,
  ChatCard: 20,
  Diagram: 21,
  Divider: 22,
  File: 23,
  Grid: 24,
  GridColumn: 25,
  Iframe: 26,
  Image: 27,
  ISV: 28,
  Mindnote: 29,
  Sheet: 30,
  Table: 31,
  TableCell: 32,
  View: 33,
  QuoteContainer: 34,
} as const;

export interface TextElementStyle {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  inline_code?: boolean;
  link?: { url: string };
}

export interface TextRun {
  content: string;
  text_element_style?: TextElementStyle;
}

export interface MentionDoc {
  token: string;
  obj_type: number;
  url?: string;
  title?: string;
}

export interface MentionUser {
  user_id: string;
}

export interface EquationContent {
  content: string;
}

export interface TextElement {
  text_run?: TextRun;
  mention_doc?: MentionDoc;
  mention_user?: MentionUser;
  equation?: EquationContent;
}

export interface BlockTextStyle {
  align?: number;
  done?: boolean;
  folded?: boolean;
  language?: number;
  wrap?: boolean;
}

export interface BlockText {
  style?: BlockTextStyle;
  elements: TextElement[];
}

export interface BlockImage {
  token: string;
  width?: number;
  height?: number;
}

export interface TableMergeInfo {
  row_span: number;
  col_span: number;
}

export interface TableProperty {
  row_size: number;
  column_size: number;
  merge_info?: TableMergeInfo[];
}

export interface BlockTable {
  cells: string[];
  property: TableProperty;
}

export interface DocxBlock {
  block_id: string;
  parent_id?: string;
  children?: string[];
  block_type: number;
  page?: BlockText;
  text?: BlockText;
  heading1?: BlockText;
  heading2?: BlockText;
  heading3?: BlockText;
  heading4?: BlockText;
  heading5?: BlockText;
  heading6?: BlockText;
  heading7?: BlockText;
  heading8?: BlockText;
  heading9?: BlockText;
  bullet?: BlockText;
  ordered?: BlockText;
  code?: BlockText;
  quote?: BlockText;
  equation?: BlockText;
  todo?: BlockText;
  callout?: BlockText;
  image?: BlockImage;
  table?: BlockTable;
  table_cell?: Record<string, unknown>;
  divider?: Record<string, unknown>;
  quote_container?: Record<string, unknown>;
  grid?: Record<string, unknown>;
  grid_column?: Record<string, unknown>;
}

export interface DocxDocument {
  document_id: string;
  revision_id: number;
  title: string;
}
