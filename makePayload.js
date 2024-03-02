export function makePayload(
    failedTests,
    runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  ) {
    const blocks = [
      { type: 'section', text: { type: 'plain_text', text: `:red_circle: XCTest is failed at ${runUrl}`, emoji: true } },
      { type: 'divider' }
    ].concat(failedTests.map(test => ({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Test Name:*\n${test.name}` },
        { type: 'mrkdwn', text: `*Duration:*\n${test.duration}` },
        { type: 'mrkdwn', text: `*Module:*\n${test.module}` },
        { type: 'mrkdwn', text: `*Test Case:*\n${test.testCaseName}` }
      ]
    })));

    return JSON.stringify({ blocks }, null, 2);
  }