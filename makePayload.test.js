const makePayload = require('./makePayload');

test('makePayload includes all necessary information in payload', () => {
    const failedTests =  [{
        "module": "TestTests",
        "identifierURL": "test://com.apple.xcode/Test/TestTests",
        "projectRelativePath": "Test.xcodeproj",
        "targetName": "TestTests",
        "tests": [
          {
            "name": "All tests",
            "subtests": [
              {
                "name": "TestTests",
                "subtests": [
                  {
                    "name": "HogeTests",
                    "subtests": [
                      {
                        "name": "testFuga()",
                        "testStatus": "Failure",
                        "identifier": "HogeTests/testFuga()",
                        "duration": "0.6501309871673584"
                      }
                    ]
                  },
                  {
                    "name": "FugaTests",
                    "subtests": []
                  },
                  {
                    "name": "FooTests",
                    "subtests": [
                      {
                        "name": "testExample()",
                        "testStatus": "Failure",
                        "identifier": "FooTests/testExample()",
                        "duration": "0.0015749931335449219"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }];
    const runUrl = 'https://example.com';
    const result = makePayload.makePayload(failedTests, runUrl);
    const expected = {
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "plain_text",
              "text": ":red_circle: XCTest is failed at https://example.com",
              "emoji": true
            }
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Test Name:*\nundefined"
              },
              {
                "type": "mrkdwn",
                "text": "*Duration:*\nundefined"
              },
              {
                "type": "mrkdwn",
                "text": "*Module:*\nTestTests"
              },
              {
                "type": "mrkdwn",
                "text": "*Test Case:*\nundefined"
              }
            ]
          }
        ]
      };
    expect(result).toEqual(expected);
});