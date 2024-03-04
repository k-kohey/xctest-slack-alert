const { execSync } = require('child_process');
const core = require('@actions/core');

function runCommand(command) {
    core.info(`Running command: ${command}`);
    try {
      const result = execSync(command, { encoding: 'utf-8' });
      core.info(`Command output: ${result}`);
      return result;
    } catch (error) {
      core.error(`Command execution failed: ${error.stderr}`);
      throw new Error(`Command execution failed: ${error.stderr}`);
    }
}

function getFailedTestIds(xcresultPath) {
    const command = `xcrun xcresulttool get --path ${xcresultPath} --format json | jq -r '.actions._values[] | select(.actionResult.testsRef != null) | .actionResult.testsRef.id._value'`;
    const ids = runCommand(command).trim().split(/\n/);
    core.info(`Failed test ids: ${ids}`);
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

function getFailedTests(xcresultPath) {
    const failedTestIds = getFailedTestIds(xcresultPath);
    if (!failedTestIds) {
      core.info('No failed tests found');
      throw new Error(`No failed tests found`);
    }
  
    const failedTests = failedTestIds.flatMap(id => {
      const details = getTestDetails(xcresultPath, id);
      return formatTestDetails(details);
    });
    return failedTests;
}

module.exports = { getFailedTests }