const { getFailedTests } = require('./xcresulttool');

test('getFailedTests returns failed tests', () => {
    const xcresultPath = '.github/TestData/single_module.xcresult';
    const failedTests = getFailedTests(xcresultPath);
    expect(failedTests).toEqual([
        {
          name: 'testFuga()',
          duration: '0.650',
          module: 'TestTests',
          testCaseName: 'HogeTests'
        },
        {
          name: 'testExample()',
          duration: '0.002',
          module: 'TestTests',
          testCaseName: 'FooTests'
        }
      ]
    );
});