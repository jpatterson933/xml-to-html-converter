import { describe, expect, it, vi } from "vitest";
import { isMalformed, scaffold, walk } from "../src/index";

describe("visit order", () => {
  it("visits every node in the tree depth-first", () => {
    const visited: string[] = [];
    walk(scaffold("<a><b><c/></b><d/></a>"), (node) => {
      if (node.xmlTag) visited.push(node.xmlTag);
    });
    expect(visited).toEqual(["a", "b", "c", "d"]);
  });

  it("visits the parent before its children", () => {
    const visited: string[] = [];
    walk(scaffold("<root><child/></root>"), (node) => {
      if (node.xmlTag) visited.push(node.xmlTag);
    });
    expect(visited[0]).toBe("root");
    expect(visited[1]).toBe("child");
  });

  it("visits siblings in document order", () => {
    const visited: string[] = [];
    walk(scaffold("<a/><b/><c/>"), (node) => {
      if (node.xmlTag) visited.push(node.xmlTag);
    });
    expect(visited).toEqual(["a", "b", "c"]);
  });
});

describe("visitor receives correct nodes", () => {
  it("passes the full node object to the visitor", () => {
    const nodes = scaffold("<book/>");
    const received: ReturnType<typeof scaffold> = [];
    walk(nodes, (node) => received.push(node));
    expect(received[0]).toBe(nodes[0]);
  });

  it("visits all node roles including textLeaf and comment", () => {
    const roles: string[] = [];
    walk(scaffold("<p>hello<!-- note --></p>"), (node) => {
      roles.push(node.role);
    });
    expect(roles).toContain("openTag");
    expect(roles).toContain("textLeaf");
    expect(roles).toContain("comment");
  });
});

describe("edge cases", () => {
  it("does nothing on an empty array", () => {
    const visitor = vi.fn();
    walk([], visitor);
    expect(visitor).not.toHaveBeenCalled();
  });

  it("visits a single leaf node once", () => {
    const visitor = vi.fn();
    walk(scaffold("<br/>"), visitor);
    expect(visitor).toHaveBeenCalledTimes(1);
  });

  it("visits all nodes in a deeply nested tree", () => {
    const visited: string[] = [];
    walk(scaffold("<a><b><c><d/></c></b></a>"), (node) => {
      if (node.xmlTag) visited.push(node.xmlTag);
    });
    expect(visited).toEqual(["a", "b", "c", "d"]);
  });
});

describe("practical usage", () => {
  it("collects all textLeaf nodes", () => {
    const text: string[] = [];
    walk(scaffold("<root><p>hello</p><p>world</p></root>"), (node) => {
      if (node.role === "textLeaf") text.push(node.raw);
    });
    expect(text).toEqual(["hello", "world"]);
  });

  it("finds all nodes matching a tag name", () => {
    const titles: ReturnType<typeof scaffold> = [];
    walk(scaffold("<root><title>A</title><title>B</title></root>"), (node) => {
      if (node.xmlTag === "title") titles.push(node);
    });
    expect(titles.length).toBe(2);
  });

  it("detects malformed nodes anywhere in the tree", () => {
    const broken: ReturnType<typeof scaffold> = [];
    walk(scaffold("<a><unclosed><b/></a>"), (node) => {
      if (isMalformed(node)) broken.push(node);
    });
    expect(broken.length).toBeGreaterThan(0);
  });
});
