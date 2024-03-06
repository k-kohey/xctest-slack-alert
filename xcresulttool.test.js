const { getFailedTests } = require('./xcresulttool');

test('getFailedTests returns failed tests when using single module', () => {
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

test('getFailedTests returns failed tests when using multi module', () => {
  const xcresultPath = '.github/TestData/multi_module.xcresult';
  const failedTests = getFailedTests(xcresultPath);
  console.log(failedTests);
  expect(failedTests).toEqual([
    {
      name: 'testFailureA2()',
      duration: '1.970',
      module: 'ATests',
      testCaseName: 'A2Tests'
    },
    {
      name: 'testFailA3()',
      duration: '0.001',
      module: 'ATests',
      testCaseName: 'A3Tests'
    },
    {
      name: 'testFailureB2()',
      duration: '0.743',
      module: 'BTests',
      testCaseName: 'B2Tests'
    },
    {
      name: 'testFuga()',
      duration: '1.974',
      module: 'TestTests',
      testCaseName: 'HogeTests'
    },
    {
      name: 'testExample()',
      duration: '0.003',
      module: 'TestTests',
      testCaseName: 'FooTests'
    }
  ]);
});