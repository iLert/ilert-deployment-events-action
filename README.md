# ilert deployment events GitHub action

This action creates an ilert deployment event.
It helps you track deployments, build completions, configuration updates, etc., providing contextual information that is critical during alert/incident triage.

## Getting started

Before you can use this action you'll need to have an ilert deployment pipeline configured.
We recommend setting up a Github pipeline, however API will work fine as well.
Upon completing those steps you should receive an integration key that you can use with this action.

Currently only `push` and `pull_request` events are handled, and for `pull_request` events, a deployment event will only be created
when the pull request is merged. You can choose which event and which branches deployment events should be created for in your
workflow configuration.

## Inputs

### `integration-key`

**Required** The integration key that identifies the ilert deployment pipeline the event originates from, added as a GitHub secret for the repository.

### `custom-event`

Custom event summary. If provided the GitHub event type is ignored and the given summary used. A link to the run is included in the deployment event.

## Example usage

```yaml
on:
  push:
    branches:
      - master
      - main
  pull_request:
    branches:
      - master
      - main
    types:
      - closed

jobs:
  send-ilert-deployment-event:
    runs-on: ubuntu-latest
    name: Sending ilert deployment event
    steps:
      - name: Create a deployment event
        uses: iLert/ilert-deployment-events-action@master
        with:
          integration-key: ${{ secrets.ILERT_DEPLOYMENT_PIPELINE_INTEGRATION_KEY }}
```

### Custom event

Custom events can be used to fine tune the point of deployment event creation e.g. after successful rollout of your software.

```yaml
on:
  push:
    branches:
      - master
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploying the application (dummy)
    steps:
      - name: Dummy step
        run: echo "Dummy deployment"

  notification:
    runs-on: ubuntu-latest
    name: Notify ilert
    needs: [deploy]
    if: always()
    steps:
      # make deploy job status available
      # see https://github.com/marketplace/actions/workflow-status-action
      - uses: martialonline/workflow-status@v3
        id: check
      - name: Create a deployment event
        uses: iLert/ilert-deployment-events-action@master
        with:
          integration-key: ${{ secrets.ILERT_DEPLOYMENT_PIPELINE_INTEGRATION_KEY }}
          custom-event: Deployment ${{ steps.check.outputs.status }}
```