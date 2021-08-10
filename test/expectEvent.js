const assert = require('chai').assert;

// receipt안에 있는 logs란 오브젝트와 찾고자 하는 eventName의 스트링을 넣어준다.
const inLogs = async (logs, eventName) => {
	// logs에서 e(이벤트)를 가져와서 eventName이 있는지 찾는다.
	const event = logs.find(e => e.event === eventName);
	// 무조건 event가 있어야 한다.
	assert.exists(event);
}

module.exports = {
    inLogs
}