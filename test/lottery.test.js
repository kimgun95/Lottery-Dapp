const Lottery = artifacts.require("Lottery");
const assertRevert = require('./assertRevert');
const expectEvent = require('./expectEvent');

contract('Lottery', function([deployer, user1, user2]){
	let lottery;
	let betAmount = 5 * 10 ** 15;
	let betAmountBN = new web3.utils.BN('5000000000000000');
	let bet_block_interval = 3;
	beforeEach(async () => {
		// 테스트 환경에서 Lottery스마트 컨트랙트 배포
		lottery = await Lottery.new();

	})

	// 팟머니 반환 테스트
	it('getPot should return current pot', async () => {
		let pot = await lottery.getPot();
		assert.equal(pot, 0)
	})

	// 배팅 테스트
	describe('Bet', function () {
		it('should fail when the bet money is not 0.005 ETH', async () => {
			// Fail transaction
			await assertRevert(lottery.bet('0xab', {from : user1, value : 4000000000000000}))
		})
		it('should put the bet to the queue with 1 bet', async () => {
			// 배팅을 한다 (추측하는 정답, 배팅자 이름, 배팅 금액)
			let receipt = await lottery.bet('0xab', {from : user1, value : betAmount});

			// 배팅이 이전에 이뤄진 적이 없기에 팟머니는 0원
			let pot = await lottery.getPot();
			assert.equal(pot, 0);

			// check contract balance == 0.005
			// 몇 ETH가 사용되었는 지 보여주는데... value값이 받아와 지는 듯하다.
			let contractBalance = await web3.eth.getBalance(lottery.address);
			assert.equal(contractBalance, betAmount);

			// 현재 block의 넘버를 반환
			let currentBlockNumber = await web3.eth.getBlockNumber();
			
			// 위에서 배팅한 정보가 0번째에 담겨있을테니 가져온다.
			let bet = await lottery.getBetInfo(0);
			assert.equal(bet.answerBlockNumber, currentBlockNumber + bet_block_interval);
			assert.equal(bet.bettor, user1);
			assert.equal(bet.challenges, '0xab');

			// check log
			await expectEvent.inLogs(receipt.logs, 'BET');
		})

	})

	// 배팅 결과에 따른 분배 테스트
	describe('Distribute', function () {
        describe('When the answer is checkable', function () {
            it('should give the user the pot when the answer matches', async () => {
                // 두 글자 다 맞았을 때
                await lottery.setAnswerForTest('0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc', {from:deployer})
                
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 1 -> 4
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 2 -> 5
                await lottery.betAndDistribute('0xab', {from:user1, value:betAmount}) // 3 -> 6
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 4 -> 7
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 5 -> 8
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 6 -> 9

				// 1,2번 트랜잭션은 성공적으로 distribute까지 처리가 된다. 
				// 그러나 3번은 7번 트랜잭션이 만들어지지 않았으므로 3~6의 트랜잭션은 distribute가 NotRevealed상태로 break가 된다.
				// 따라서 팟머니는 0.01 ETH만 쌓인 상태.                
                let potBefore = await lottery.getPot(); //  == 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);
                
                let receipt7 = await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 7 -> 10 // user1에게 pot이 간다

                let potAfter = await lottery.getPot(); // == 0 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1); // == before + 0.015 ETH
                
                // 팟머니 변화량 확인 0.01 -> 0 ETH
                assert.equal(potBefore.toString(), new web3.utils.BN('10000000000000000').toString());
                assert.equal(potAfter.toString(), new web3.utils.BN('0').toString());

                // user1(winner)의 밸런스를 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
				user1BalanceAfter = new web3.utils.BN(user1BalanceAfter);
                assert.equal(user1BalanceBefore.add(potBefore).add(betAmountBN).toString(), user1BalanceAfter.toString())

            })
			
			it('should give the user the amount he or she bet when a single character matches', async () => {
                // 한 글자 맞았을 때
                await lottery.setAnswerForTest('0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc', {from:deployer})
                
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 1 -> 4
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 2 -> 5
                await lottery.betAndDistribute('0xaf', {from:user1, value:betAmount}) // 3 -> 6
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 4 -> 7
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 5 -> 8
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 6 -> 9
                
                let potBefore = await lottery.getPot(); //  == 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);
                
                let receipt7 = await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 7 -> 10 // user1에게 배팅한 금액만 간다

                let potAfter = await lottery.getPot(); // == 0.01 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1); // == before + 0.005 ETH
                
                // 팟머니 변화량 확인 0.01 -> 0.01 ETH
                assert.equal(potBefore.toString(), potAfter.toString());

                // user1(winner)의 밸런스를 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
				user1BalanceAfter = new web3.utils.BN(user1BalanceAfter);
                assert.equal(user1BalanceBefore.add(betAmountBN).toString(), user1BalanceAfter.toString())
            })
            
			it.only('should get the eth of user when the answer does not match at all', async () => {
                // 다 틀렸을 때
                await lottery.setAnswerForTest('0xabec17438e4f0afb9cc8b77ce84bb7fd501497cfa9a1695095247daa5b4b7bcc', {from:deployer})
                
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 1 -> 4
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 2 -> 5
                await lottery.betAndDistribute('0xef', {from:user1, value:betAmount}) // 3 -> 6
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 4 -> 7
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 5 -> 8
                await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 6 -> 9
                
                let potBefore = await lottery.getPot(); //  == 0.01 ETH
                let user1BalanceBefore = await web3.eth.getBalance(user1);
                
                let receipt7 = await lottery.betAndDistribute('0xef', {from:user2, value:betAmount}) // 7 -> 10 // pot은 그냥 쌓이게 된다.

                let potAfter = await lottery.getPot(); // == 0.015 ETH
                let user1BalanceAfter = await web3.eth.getBalance(user1); // == before
                
                // 팟머니 변화량 확인 0.01 -> 0.015 ETH
                assert.equal(potBefore.add(betAmountBN).toString(), potAfter.toString());

                // user1(winner)의 밸런스를 확인
                user1BalanceBefore = new web3.utils.BN(user1BalanceBefore);
				user1BalanceAfter = new web3.utils.BN(user1BalanceAfter);
                assert.equal(user1BalanceBefore.toString(), user1BalanceAfter.toString())
            })


        })

        describe('When the answer is not revealed(Not Mined)', function () {

        })
        
        describe('When the answer is not revealed(Block limit is passed)', function () {

        })

    })

	// 배팅 결과 테스트(win, fail, draw)
	describe('isMatch', function () {
		// 임의의 블록해시 정답값 설정
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