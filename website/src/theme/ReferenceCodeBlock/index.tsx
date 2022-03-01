import { URL } from "url";
import React, { Dispatch, useReducer } from "react";
import OriginalCodeBlock from "@theme-original/CodeBlock";

import type {
  ReferenceCodeBlockProps,
  GitHubReference,
  DispatchMessage,
} from "../types";

const initialFetchResultState = {
  code: "loading...",
  error: null,
  loading: null,
};

/**
 * parses GitHub reference
 * @param {string} ref url to github file
 */
export function parseReference(ref: string): GitHubReference {
  const fullUrl = ref.slice(ref.indexOf("https"));
  const [url, loc] = fullUrl.split("#");

  /**
   * webpack causes failures when it tries to render this page
   */
  const global = globalThis || { URL: undefined };
  if (!global.URL) {
    // @ts-ignore
    global.URL = URL;
  }

  const [org, repo, blob, branch, ...pathSeg] = new global.URL(url).pathname
    .split("/")
    .slice(1);
  const [fromLine, toLine] = loc
    ? loc.split("-").map((lineNr) => parseInt(lineNr.slice(1), 10) - 1)
    : [0, Infinity];
  return {
    url: `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${pathSeg.join(
      "/"
    )}`,
    fromLine,
    toLine,
    title: pathSeg.join("/"),
  };
}

async function getCode(ghRef: GitHubReference) {
  const { url, fromLine, toLine } = ghRef;
  let res = await fetch(url);

  if (res.status !== 200) {
    const error = await res.text();
    throw new Error(error);
  }
  const body = (await res.text())
    .split("\n")
    .slice(fromLine, (toLine || fromLine) + 1);

  const preceedingSpace = body.reduce((prev: number, line: string) => {
    if (line.length === 0) {
      return prev;
    }

    const spaces = line.match(/^\s+/);
    if (spaces) {
      return Math.min(prev, spaces[0].length);
    }

    return 0;
  }, Infinity);
  return body.map((line) => line.slice(preceedingSpace)).join("\n");
}

async function resolveImports(
  body: string,
  dispatch: Dispatch<DispatchMessage>
) {
  const regexPattern = /i\(\'(.+)\'\)/g;
  const matches = body.matchAll(regexPattern);

  const importUrlsPromises = await Array.from(matches, async (match) => {
    if (match.length >= 2) {
      const ref = parseReference(match[1]);
      const code = await getCode(ref);
      return { [match[0]]: code };
    }
    return { [match[0]]: "" };
  });

  try {
    let result = body;
    const importedCode = await Promise.all(importUrlsPromises);
    importedCode.forEach(
      async (ele) =>
        (result = result.replace(
          Object.keys(ele)[0],
          ele[Object.keys(ele)[0]]
        ))
    );
    return dispatch({
      type: "loaded",
      value: result,
    });
  } catch (err: any) {
    return dispatch({ type: "error", value: err });
  }
}

export function codeReducer(prevState: any, { type, value }: DispatchMessage) {
  switch (type) {
    case "reset": {
      return initialFetchResultState;
    }
    case "loading": {
      return { ...prevState, loading: true };
    }
    case "loaded": {
      return { ...prevState, code: value, loading: false };
    }
    case "error": {
      return { ...prevState, error: value, loading: false };
    }
    default:
      return prevState;
  }
}

function ReferenceCode(props: ReferenceCodeBlockProps) {
  const [fetchResultState, fetchResultStateDispatcher] = useReducer(
    codeReducer,
    initialFetchResultState
  );

  if (fetchResultState.loading !== false) {
    resolveImports(props.children as string, fetchResultStateDispatcher);
  }

  const titleMatch = props.metastring?.match(/title="(?<title>.*)"/);

  const customProps = {
    ...props,
    metastring: titleMatch?.groups?.title
      ? ` title="${titleMatch?.groups?.title}"`
      : "",
    children: initialFetchResultState.code,
  };


  return <OriginalCodeBlock {...customProps}>{fetchResultState.code}</OriginalCodeBlock>;
}

export default ReferenceCode;
