// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Lottery {

	// 배팅 정보
	struct BetInfo {
		uint256 answerBlockNumber;
		// 특정 주소에 돈을 보내려면 payable 작성 필수
		address payable bettor;
		byte challenges; // 0xab
	}

	address public owner;

	// map을 이용한 선형 queue 사용, 배팅 정보들을 저장
	uint256 private _tail;
	uint256 private _head;
	mapping (uint256 => BetInfo) private _bets;
	

	uint256 constant internal BLOCK_LIMIT = 256; // 블럭해쉬 제한을 256
	uint256 constant internal BET_BLOCK_INTERVAL = 3; // 3번 째 뒤 블럭에 대해 배팅을 하겠다
	uint256 constant internal BET_AMOUNT = 5 * 10 ** 15; // 5 * 0.001ETH
	uint256 private _pot; // 팟머니를 저장할 곳

	enum BettingResult {Win, Fail, Draw}
	enum BlockStatus {Checkable, NotRevealed, BlockLimitPassed}
	event BET(uint256 index, address bettor, uint256 amount, byte challenges, uint256 answerBlockNumber);

	constructor() public {
		owner = msg.sender;
	}

	// 스마트 컨트랙트에 있는 변수를 조회하는 수식어는 view 필수
	function getPot() public view returns (uint256 pot) {
		return _pot;
	}

	/**
     * @dev 베팅을 한다. 유저는 0.005 ETH를 보내야 하고, 베팅용 1 byte 글자를 보낸다.
     * 큐에 저장된 베팅 정보는 이후 distribute 함수에서 해결된다.
     * @param challenges 유저가 베팅하는 글자
     * @return 함수가 잘 수행되었는지 확인해는 bool 값
     */
	function bet(byte challenges) public payable returns (bool result) {
		// check the proper ether is sent
		require(msg.value == BET_AMOUNT, "Not enough ETH");
		// push bet to the queue
		require(pushBet(challenges), "Fail to add a new Bet Info");
		// emit event
		emit BET(_tail - 1, msg.sender, msg.value, challenges, block.number + BET_BLOCK_INTERVAL);
		return true;
	}

	
	// distribute
	function distribute() public {
		uint256 cur;
		BetInfo memory b;
		BlockStatus currentBlockStatus;

		for (cur = _head; cur < _tail; cur++) {
			b = _bets[cur];
			currentBlockStatus = getBlockStatus(b.answerBlockNumber);
			// Checkable: block.number > AnswerBlockNumber && block.number  <  BLOCK_LIMIT + AnswerBlockNumber
			if (currentBlockStatus == BlockStatus.Checkable) {
				// if win, bettor gets pot

				// if fail, bettor's money goes pot

				// if draw, refund bettor's money

			}
			// Not Revealed: block.number <= AnswerBlockNumber
			if (currentBlockStatus == BlockStatus.NotRevealed) {
				break;
			}
			// Block Limit Passed: block.number >= AnswerBlockNumber + BLOCK_LIMIT
			if (currentBlockStatus == BlockStatus.BlockLimitPassed) {
				// refunc

				// emit refund
			}

			popBet(cur);
		}
	}

	function isMatch(byte challenges, bytes32 answer) public pure returns (BettingResult) {
		// challenges 0xab
		// answer 0xab......ff 32 bytes

		byte c1 = challenges;
		byte c2 = challenges;
		
		byte a1 = answer[0]; // 0번 해쉬를 가져오는 것. byte단위니까 ab를 가져오는 것 같음.
		byte a2 = answer[0];

		 // Get first number
        c1 = c1 >> 4; // 0xab -> 0x0a
        c1 = c1 << 4; // 0x0a -> 0xa0

        a1 = a1 >> 4;
        a1 = a1 << 4;

        // Get Second number
        c2 = c2 << 4; // 0xab -> 0xb0
        c2 = c2 >> 4; // 0xb0 -> 0x0b

        a2 = a2 << 4;
        a2 = a2 >> 4;

        if(a1 == c1 && a2 == c2) {
            return BettingResult.Win;
        }

        if(a1 == c1 || a2 == c2) {
            return BettingResult.Draw;
        }

        return BettingResult.Fail;
	}

	function getBlockStatus(uint256 answerBlockNumber) internal view returns (BlockStatus) {
		if(block.number > answerBlockNumber && block.number  <  BLOCK_LIMIT + answerBlockNumber) {
			return BlockStatus.Checkable;
		}

		if(block.number <= answerBlockNumber) {
			return BlockStatus.NotRevealed;
		}

		if(block.number >= answerBlockNumber + BLOCK_LIMIT) {
			return BlockStatus.BlockLimitPassed;
		}

		return BlockStatus.BlockLimitPassed;
	}

	function getBetInfo(uint256 index) public view returns (uint256 answerBlockNumber, address bettor, byte challenges) {
		// 받아온 index를 통해 _bets[index]를 조회하여 betInfo를 반환.
		BetInfo memory b = _bets[index];
		answerBlockNumber = b.answerBlockNumber;
		bettor = b.bettor;
		challenges = b.challenges;
	}

	// 배팅을 큐에 저장한다.
	function pushBet(byte challenges) internal returns (bool) {
		BetInfo memory b;
		b.bettor = msg.sender; // 보낸 사람의 address를 사용 가능.
		b.answerBlockNumber = block.number + BET_BLOCK_INTERVAL; // 트랜잭션의 block number받아옴. + BET_BLOCK_INTERVAL
		b.challenges = challenges;

		_bets[_tail] = b;
		_tail++;
		return true;
	}

	// delete를 이용해 데이터를 아예 삭제한다. 이러면 gas를 돌려받을 수 있음.
	function popBet(uint256 index) internal returns (bool) {
		delete _bets[index];
		return true;
	}

}