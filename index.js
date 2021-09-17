"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require('@actions/core');
const github = require('@actions/github');
const matchAll = require("match-all");
const Octokit = require("@octokit/rest");
async function extractJiraKeysFromCommit() {
    try {
        const regex = /(([A-Z]+)(([A-Z]+)|([0-9]+))+-\d+)/g;
        const isPullRequest = core.getInput('is-pull-request') == 'true';
        const commitMessage = core.getInput('commit-message');
        const parseAllCommits = core.getInput('parse-all-commits') == 'true';
        const payload = github.context.payload;
        const token = process.env['GITHUB_TOKEN'];
        const octokit = new Octokit({
            auth: token,
        });
        if (isPullRequest) {
            let resultArr = [];
            const owner = payload.repository.owner.login;
            const repo = payload.repository.name;
            const prNum = payload.number;
            const pullInfo = (await octokit.pulls.get({
                owner: owner,
                repo: repo,
                pull_number: prNum
            })).data;
            const commitsPerPage = 100;
            const numCommitPages = Math.ceil(pullInfo.commits / commitsPerPage);
            const headBranch = pullInfo.head.ref;
            const baseBranch = pullInfo.base.ref;
            /* Make sure we go through all the commits of a PR */
            for (let i = 0; i < numCommitPages; i++) {
                const { data } = await octokit.pulls.listCommits({
                    owner: owner,
                    repo: repo,
                    pull_number: prNum,
                    per_page: commitsPerPage,
                    page: i
                });
                data.forEach((item) => {
                    const commit = item.commit;
                    const matches = matchAll(commit.message, regex).toArray();
                    matches.forEach((match) => {
                        if (!resultArr.find((element) => element == match)) {
                            resultArr.push(match);
                        }
                    });
                });
            }
            const prTitleMatches = matchAll(github.context.payload.pull_request.title, regex).toArray();
            prTitleMatches.forEach((match) => {
                if (resultArr.find((element) => element == match)) {
                    // console.log(match + " is already included in result array");
                }
                else {
                    // console.log(" adding " + match + " to result array");
                    resultArr.push(match);
                }
            });
            if (headBranch) {
                const headBranchNameMatches = matchAll(headBranch, regex).toArray();
                headBranchNameMatches.forEach((match) => {
                    if (resultArr.find((element) => element == match)) {
                    }
                    else {
                        resultArr.push(match);
                    }
                });
            }
            if (parseAllCommits && baseBranch) {
                const commits = (await octokit.repos.listCommits({
                    owner: owner,
                    repo: repo,
                    per_page: 100,
                    sha: baseBranch
                })).data;
                commits.forEach((item) => {
                    const commit = item.commit;
                    const matches = matchAll(commit.message, regex).toArray();
                    matches.forEach((match) => {
                        if (!resultArr.find((element) => element == match)) {
                            resultArr.push(match);
                        }
                    });
                });
            }
            const result = resultArr.join(',');
            core.setOutput("jira-keys", result);
        }
        else {
            if (commitMessage) {
                const matches = matchAll(commitMessage, regex).toArray();
                const result = matches.join(',');
                core.setOutput("jira-keys", result);
            }
            else {
                if (parseAllCommits) {
                    let resultArr = [];
                    payload.commits.forEach((commit) => {
                        const matches = matchAll(commit.message, regex).toArray();
                        matches.forEach((match) => {
                            if (resultArr.find((element) => element == match)) {
                            }
                            else {
                                resultArr.push(match);
                            }
                        });
                    });
                    const result = resultArr.join(',');
                    core.setOutput("jira-keys", result);
                }
                else {
                    const matches = matchAll(payload.head_commit.message, regex).toArray();
                    const result = matches.join(',');
                    core.setOutput("jira-keys", result);
                }
            }
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
(async function () {
    await extractJiraKeysFromCommit();
    // console.log("finished extracting jira keys from commit message");
})();
exports.default = extractJiraKeysFromCommit;
