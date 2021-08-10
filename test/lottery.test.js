const Lottery = artifacts.require("Lottery");

contract('Lottery', function([deployer, user1, uesr2]){
	let lottery;
	beforeEach(async () => {
		
		console.log('Before each')
		// 테스트 환경에서 Lottery스마트 컨트랙트 배포
		lottery = await Lottery.new();

	})

	it('Basic test', async () => {
		console.log('Basic test')
		let owner = await lottery.owner();
		let value = await lottery.getSomeValue();

		console.log(`owner : ${owner}`);
		console.log(`value : ${value}`);
		assert.equal(10, 10)
	})
});