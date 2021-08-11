const Lottery = artifacts.require("Lottery");
const assertRevert = require('./assertRevert');
const expectEvent = require('./expectEvent');

contract('Lottery', function([deployer, user1, uesr2]){
	let lottery;
	let betAmount = 5 * 10 ** 15;
	let bet_block_interval = 3;
	beforeEach(async () => {
		// 테스트 환경에서 Lottery스마트 컨트랙트 배포
		lottery = await Lottery.new();

	})


	it('getPot should return current pot', async () => {
		let pot = await lottery.getPot();
		assert.equal(pot, 0)
	})

	describe('Bet', function () {
		it('should fail when the bet money is not 0.005 ETH', async () => {
			// Fail transaction
			await assertRevert(lottery.bet('0xab', {from : user1, value : 4000000000000000}))
		})
		it('should put the bet to the queue with 1 bet', async () => {
			// bet
			let receipt = await lottery.bet('0xab', {from : user1, value : betAmount});

			let pot = await lottery.getPot();
			assert.equal(pot, 0);

			// check contract balance == 0.005
			let contractBalance = await web3.eth.getBalance(lottery.address);
			assert.equal(contractBalance, betAmount);
			// check bet info
			let currentBlockNumber = await web3.eth.getBlockNumber();

			let bet = await lottery.getBetInfo(0);
			assert.equal(bet.answerBlockNumber, currentBlockNumber + bet_block_interval);
			assert.equal(bet.bettor, user1);
			assert.equal(bet.challenges, '0xab');
			// check log
			await expectEvent.inLogs(receipt.logs, 'BET');
		})

	})

	describe.only('isMatch', function () {
        let blockHash = '0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc'
        it('should be BettingResult.Win when two characters match', async () => {
            
            let matchingResult = await lottery.isMatch('0xab', blockHash);
            assert.equal(matchingResult, 0);
        })

        it('should be BettingResult.Fail when two characters match', async () => {
            let matchingResult = await lottery.isMatch('0xcd', blockHash);
            assert.equal(matchingResult, 1);
        })

        it('should be BettingResult.Draw when two characters match', async () => {
            let matchingResult = await lottery.isMatch('0xaf', blockHash);
            assert.equal(matchingResult, 2);

            matchingResult = await lottery.isMatch('0xfb', blockHash);
            assert.equal(matchingResult, 2);
        })
    })
});