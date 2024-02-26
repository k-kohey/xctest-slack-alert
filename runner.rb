require 'json'
require 'open3'
require 'logger'

def setup_logger(verbose)
  logger = Logger.new($stdout)
  logger.level = verbose ? Logger::DEBUG : Logger::INFO
  logger
end

def find_arg_value(arg_name)
  ARGV.each_with_index do |arg, index|
    return ARGV[index + 1] if arg == arg_name && index + 1 < ARGV.length
  end
  nil
end

def execute_command(command, logger)
  logger.debug("Run #{command}")
  stdout, stderr, status = Open3.capture3(command)
  unless status.success?
    logger.error("Command Error: #{stderr}")
    raise "Command Error: #{stderr}"
  end
  logger.debug("Get #{stdout}")
  stdout
end

def fetch_test_details(xcresult_path, id, logger)
  command = "
  xcrun xcresulttool get --path #{xcresult_path} --format json --id #{id} | \
  jq '.summaries._values[].testableSummaries._values[] | \
  {module: .name._value, identifierURL: .identifierURL._value, \
    projectRelativePath: .projectRelativePath._value, targetName: .targetName._value, tests: [.tests._values[]? | \
  {name: .name._value, subtests: [.subtests._values[]? | \
  {name: .name._value, subtests: [.subtests._values[]? | \
  {name: .name._value, subtests: [.subtests._values[]? | \
  {name: .name._value, testStatus: .testStatus._value, identifier: .identifier._value, duration: .duration._value} | \
  select(.testStatus == \"Failure\")]}]}]}]}'
  "
  JSON.parse(execute_command(command, logger))
end

xcresult_path = find_arg_value('--xcresult_path')
raise ArgumentError, 'xcresult_path is required' unless xcresult_path
raise ArgumentError, "xcresult_path: #{xcresult_path} does not exist" unless File.exist?(xcresult_path)

verbose = find_arg_value('--verbose') == 'true'
logger = setup_logger(verbose)

id_command = "
xcrun xcresulttool get --path #{xcresult_path} --format json | \
jq -r '.actions._values[] | \
select(.actionResult.testsRef != null) | \
.actionResult.testsRef.id._value'
"
ids = execute_command(id_command, logger).strip.split(/\n/)

if ids.empty?
  logger.info('No failed tests found')
  exit 0
else
  logger.debug("Failed test ids: #{ids}")
end

output_blocks = []
ids.each do |id|
  details = fetch_test_details(xcresult_path, id, logger)
  logger.debug("Test details: #{details}")

  details['tests'].each do |test|
    test['subtests'].each do |subtest|
      subtest['subtests'].each do |test_case|
        test_case['subtests'].each do |failed_test|
          next unless failed_test['testStatus'] == 'Failure'

          duration_rounded = failed_test['duration'].to_f.round(3)
          content_blocks = [
            { 'type' => 'section', 'text' => { 'type' => 'mrkdwn', 'text' => "*#{failed_test['name']}*" } },
            { 'type' => 'section', 'fields' => [
              { 'type' => 'mrkdwn', 'text' => "*Duration:*\n#{duration_rounded}" },
              { 'type' => 'mrkdwn', 'text' => "*Module:*\n#{details['module']}" },
              { 'type' => 'mrkdwn', 'text' => "*Test Case:*\n#{test_case['name']}" }
            ] },
            { 'type' => 'divider' }
          ]
          output_blocks.concat(content_blocks)
        end
      end
    end
  end
end

run_url = find_arg_value('--run-url') || 'GitHub Actions'
output = {
  'blocks' => [
    {
      'type' => 'section',
      'text' => { 'type' => 'plain_text', 'text' => ":red_circle: XCTest is failed at #{run_url}", 'emoji' => true }
    },
    { 'type' => 'divider' }
  ] + output_blocks
}

json = JSON.pretty_generate(output)
logger.debug("Create payload: #{json}")

output_path = find_arg_value('--output') || 'payload.json'
File.open(output_path, 'w') do |file|
  logger.info('Write payload to file payload.json')
  file.write(json)
end
