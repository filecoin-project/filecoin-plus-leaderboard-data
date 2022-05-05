// deno-lint-ignore-file
import { Octokit } from "https://cdn.skypack.dev/octokit?dts";
import {
  IssueComment,
  IssueCommentConnection,
  IssueConnection,
  PullRequestConnection,
} from "https://cdn.skypack.dev/@octokit/graphql-schema?dts";

const GITHUB_API_TOKEN = Deno.env.get("GITHUB_TOKEN");
const octokit = new Octokit({ auth: GITHUB_API_TOKEN });

async function loopEdges<A>(
  connection: IssueConnection | PullRequestConnection | IssueCommentConnection,
  options: Partial<{
    onNext: (cursor: string, data: A[]) => Promise<A[] | void>;
    onNode: (node: A) => A | Promise<A>;
  }> = {},
): Promise<A[]> {
  const data: A[] = [];

  let lastCursor: string | null = null;

  if (connection.edges && connection.edges.length) {
    for (const edge of connection.edges) {
      if (edge) {
        let node = edge.node as unknown as A;

        if (options.onNode) {
          node = await options.onNode(node);
        }

        data.push(node);

        lastCursor = edge.cursor;
      }
    }
  }

  if (connection.pageInfo.hasNextPage && lastCursor && options.onNext) {
    const response = await options.onNext(lastCursor, data);

    if (response) {
      data.push(...response);
    }
  }

  return data;
}

export type QueryOption = Record<string, string | number | string[]>;
// @ts-ignore
export const getAllIssues = async (options: QueryOption = {}) => {
  const QUERY = `
  query ($owner: String!, $repo: String!, $after: String, $num: Int = 100) {
    repository(owner:$owner, name:$repo) {
      issues(first:$num, after:$after, orderBy: {field: CREATED_AT, direction: DESC}) {
        pageInfo {
          startCursor
          endCursor
          hasNextPage
        }
        edges {
          cursor
          node {
            number
            title
            body
            comments(first: 100) {
              edges {
                node {
                  body
                }
              }
            }
          }
        }
      }
    }
  }
`;
  const response = await octokit.graphql(QUERY, {
    owner: "filecoin-project",
    repo: "notary-governance",
    num: 100,
    ...options,
  });

  const issuesConnection = response.repository?.issues;

  return await loopEdges<IssueComment>(issuesConnection, {
    onNext: (cursor) => getAllIssues({ ...options, after: cursor }),
  });
};

export async function getIssues() {
  const allIssues = await getAllIssues();
  console.log("allIssues.length ->", allIssues.length);
  // console.log('issueNumber(460) ->', allIssues.filter(v => v.number === 460));

  return allIssues;
}
