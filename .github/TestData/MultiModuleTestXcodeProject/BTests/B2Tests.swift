import XCTest
@testable import B

final class B2Tests: XCTestCase {
    func testSuccessB2() throws {}

    func testFailureB2() throws {
        XCTFail("Failure at B2")
    }
}
