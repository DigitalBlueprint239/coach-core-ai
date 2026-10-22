import {undo,redo} from '../PlayController';
test('undo after redo returns to the immediate previous edit, including a pre-existing history',()=>{
 const a={players:[],routes:[]},b={players:[{id:'b'}],routes:[]},c={players:[{id:'c'}],routes:[]};
 const [restored,history,future]=redo([a],[c],b);
 expect(restored).toEqual(c);
 expect(undo(history,future,restored)[0]).toEqual(b);
});
