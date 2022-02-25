/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import ReferenceCodeBlock from "../ReferenceCodeBlock";
import OriginalCodeBlock from "@theme-original/CodeBlock";

import type { ReferenceCodeBlockProps } from "../types";

const CodeBlock = (props: ReferenceCodeBlockProps) => {
  if (props.reference) {
    return <ReferenceCodeBlock {...props} />;
  }

  return <OriginalCodeBlock {...props} />;
};

export default CodeBlock;
