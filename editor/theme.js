import { EditorView } from "codemirror";
import { syntaxHighlighting } from "@codemirror/language";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";

const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "var(--bg)",
      color: "var(--text)",
      fontSize: "13px",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-scroller": {
      fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
      lineHeight: "1.5",
    },
    ".cm-gutters": {
      backgroundColor: "var(--bg)",
      color: "var(--muted)",
      border: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "#ffffff08",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "var(--text)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--text)",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#ffffff1f",
      },
  },
  { dark: true }
);

export const theme = [editorTheme, syntaxHighlighting(oneDarkHighlightStyle)];
