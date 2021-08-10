module.exports = async (promise) => {
	try {
		await promise;
		// AssertionError를 발생시키는 메서드.
		assert.fail('Expected revert not received');
	} catch (error) {
		// 에러 메시지에 revert가 있다면.
		const revertFound = error.message.search('revert') >= 0;
		assert(revertFound, `Expected "revert", got ${error} insetad`);
	}
}