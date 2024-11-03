const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

const DEPLOYMENTS_URL = "https://api.ilert.com/api/deployment-events";
const GH_ACTION_VERSION = "1.0.1";

async function sendDeploymentEvent(payload) {

    try {
        const response = await axios.post(DEPLOYMENTS_URL, payload);
        console.log(`Deployment response: ${response.status} - ${JSON.stringify(response.data)}`);

        if (response.status !== 202) {
            core.setFailed(`ilert API returned status code ${response.status}`);
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

function handleCustomEvent(summary, integrationKey) {

    const repository = process.env.GITHUB_REPOSITORY;

    const deploymentEvent = {
        apiKey: integrationKey,
        summary,
        timestamp: (new Date()).toISOString(),
        customDetails: {
            ilertDeploymentEventsAction: true,
            githubActionVersion: GH_ACTION_VERSION
        },
        // userEmail: "",
        // userName: "",
        // version: "",
        // environment: "",
        // commit: "",
        repository,
        links: [
            {
                href: `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,
                text: "View run"
            }
        ]
    };

    let _ = sendDeploymentEvent(deploymentEvent);
}

function handlePushEvent(data, integrationKey) {

    const {
        ref,
        compare: compareHref,
        repository: {
            full_name: repoFullName,
            html_url: repoHref
        },
        sender: {
            login: senderLogin,
            html_url: senderHref
        }
    } = data;

    const parts = ref.split("/");
    const branch = parts[parts.length - 1];

    const deploymentEvent = {
        apiKey: integrationKey,
        summary: `${senderLogin} pushed branch ${branch} from ${repoFullName}`.slice(0, 1024),
        timestamp: (new Date()).toISOString(),
        customDetails: {
            ilertDeploymentEventsAction: true,
            githubActionVersion: GH_ACTION_VERSION
        },
        // userEmail: "",
        userName: senderLogin,
        // version: "",
        // environment: "",
        // commit: "",
        repository: repoFullName,
        links: [
            {
                href: compareHref,
                text: "View on GitHub"
            }, {
                href: repoHref,
                text: "Repo"
            }, {
                href: senderHref,
                text: `Sender - ${senderLogin}`
            }
        ]
    };

    let _ = sendDeploymentEvent(deploymentEvent);
}

function handlePullRequestEvent(data, integrationKey) {

    const {
        pull_request: {
            title,
            body,
            commits,
            additions,
            deletions,
            changed_files: changedFiles,
            review_comments: reviewComments,
            merged_at: mergedAt,
            html_url: pullRequestUrl,
            user: {
                login: userLogin,
                html_url: userUrl
            },
            merged_by: {
                login: mergedByLogin,
                html_url: mergedByUrl
            }
        },
        repository: {
            full_name: repoName
        }
    } = data;

    const deploymentEvent = {
        apiKey: integrationKey,
        summary: `PR merged - ${repoName} ${title}`.slice(0, 1024),
        timestamp: mergedAt,
        customDetails: {
            ilertDeploymentEventsAction: true,
            githubActionVersion: GH_ACTION_VERSION,
            body: body,
            repo: repoName,
            commits: commits,
            review_comments: reviewComments,
            additions: additions,
            deletions: deletions,
            changed_files: changedFiles
        },
        // userEmail: "",
        userName: userLogin,
        // version: "",
        // environment: "",
        // commit: "",
        repository: repoName,
        links: [
            {
                href: pullRequestUrl,
                text: "View on GitHub"
            }, {
                href: mergedByUrl,
                text: `Merged by - ${mergedByLogin}`
            }, {
                href: userUrl,
                text: `Opened by - ${userLogin}`
            }
        ]
    };

    const deploymentEventString = JSON.stringify(deploymentEvent);

    // enforce the 256kb message size limit
    if (deploymentEventString.length > 262144) {
        deploymentEvent.customDetails.body = body.slice(0, deploymentEventString.length - 262144);
    }

    let _ = sendDeploymentEvent(deploymentEvent);
}

try {
    const integrationKey = core.getInput("integration-key");
    const customEvent = core.getInput("custom-event");
    const data = github.context.payload;

    if (typeof customEvent === "string" && customEvent !== "") {
        handleCustomEvent(customEvent, integrationKey);
    } else if (github.context.eventName === "push") {
        handlePushEvent(data, integrationKey);
    } else if (github.context.eventName === "pull_request" && data.action === "closed" && data.pull_request.merged) {
        handlePullRequestEvent(data, integrationKey);
    } else {
        console.log("No action taken. This event or action is not handled by this action.");
    }
} catch (error) {
    core.setFailed(error.message)
}
