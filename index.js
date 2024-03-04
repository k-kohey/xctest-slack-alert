const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { makePayload } = require('./makePayload');

try {
  const xcresultPath = core.getInput('xcresult-path', { required: true });
  const slackBotToken = core.getInput('slack-bot-token') || process.env.SLACK_BOT_TOKEN;
  core.setSecret(slackBotToken);
  const channelId = core.getInput('channel-id', { required: true });

  function runCommand(command) {
    core.debug(`Running command: ${command}`);
    try {
      const result = execSync(command, { encoding: 'utf-8' });
      core.debug(`Command output: ${result}`);
      return result;
    } catch (error) {
      core.error(`Command execution failed: ${error.stderr}`);
      throw new Error(`Command execution failed: ${error.stderr}`);
    }
  }

  function getFailedTestIds(xcresultPath) {
    const command = `xcrun xcresulttool get --path ${xcresultPath} --format json | jq -r '.actions._values[] | select(.actionResult.testsRef != null) | .actionResult.testsRef.id._value'`;
    const ids = runCommand(command).trim().split(/\n/);
    core.debug(`Failed test ids: ${ids}`);
    return ids.length === 0 ? null : ids;
  }

  function getTestDetails(xcresultPath, id) {
    const command = `
    xcrun xcresulttool get --path ${xcresultPath} --format json --id ${id} | \
    jq '.summaries._values[].testableSummaries._values[] | \
    {module: .name._value, identifierURL: .identifierURL._value, \
      projectRelativePath: .projectRelativePath._value, targetName: .targetName._value, tests: [.tests._values[]? | \
    {name: .name._value, subtests: [.subtests._values[]? | \
    {name: .name._value, subtests: [.subtests._values[]? | \
    {name: .name._value, subtests: [.subtests._values[]? | \
    {name: .name._value, testStatus: .testStatus._value, identifier: .identifier._value, duration: .duration._value} | \
    select(.testStatus == \"Failure\")]}]}]}]}'
    `;
    const result = runCommand(command);
    return JSON.parse(result);
  }

  function formatTestDetails(details) {
    return details.tests.flatMap(test => {
      return test.subtests.flatMap(subtest => {
        return subtest.subtests.flatMap(testCase => {
          return testCase.subtests.filter(failedTest => failedTest.testStatus === 'Failure').map(failedTest => {
            const durationRounded = parseFloat(failedTest.duration).toFixed(3);
            return {
              name: failedTest.name,
              duration: durationRounded,
              module: details.module,
              testCaseName: testCase.name
            };
          });
        });
      });
    });
  }

  const failedTestIds = getFailedTestIds(xcresultPath);
  if (!failedTestIds) {
    core.info('No failed tests found');
    return;
  }

  const failedTests = failedTestIds.flatMap(id => {
    const details = getTestDetails(xcresultPath, id);
    return formatTestDetails(details);
  });

  const payload = makePayload(failedTests);
  core.debug(`Payload: ${payload}`);
  
  const slackAction = require('@slack/web-api');
  const { WebClient } = slackAction;
  const web = new WebClient(slackBotToken);

  web.chat.postMessage({
    channel: channelId,
    text: ':red_circle: XCTest is failed',
    blocks: payload.blocks
  }).catch(error => {
    core.setFailed(`Slack message sending failed: ${error}`);
  });
} catch (error) {
  core.setFailed(`Action failed: ${error}`);
}
