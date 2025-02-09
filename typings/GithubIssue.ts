export interface GithubIssue {
  number: number;
  title: string;
  body: string;
  comments: Comments;
}

export interface Comments {
  edges: Edge[];
}

export interface Edge {
  node: Node;
}

export interface Node {
  body: string;
}
