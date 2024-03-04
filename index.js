const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { makePayload } = require('./makePayload');
const { getFailedTests } = require('./xcresulttool');

try {
  const xcresultPath = core.getInput('xcresult-path', { required: true });
  const slackBotToken = core.getInput('slack-bot-token') || process.env.SLACK_BOT_TOKEN;
  core.setSecret(slackBotToken);
  const channelId = core.getInput('channel-id', { required: true });

  let failedTests
  try {
    failedTests = getFailedTests(xcresultPath);
  } catch (error) {
    if (error === 'No failed tests found') {
      process.exit(0);
    } else {
      core.setFailed(`Failed to get failed tests: ${error}`);
    }
  }
  const payload = makePayload(failedTests);
  core.info(`Payload: ${payload}`);
  
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
