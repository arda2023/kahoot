import { describe, expect, it } from 'vitest';
import { nextPhase, points, rank, seedQuiz } from './index';
describe('server game rules', () => {
  it('scores correctness and elapsed time at boundaries', () => {
    expect(points(true,0,1000)).toBe(1000); expect(points(true,500,1000)).toBe(750);
    expect(points(false,0,1000)).toBe(0); expect(points(true,1000,1000)).toBe(0);
    expect(points(true,-1,1000)).toBe(0); expect(points(true,0,0)).toBe(0);
    expect(points(true,NaN,1000)).toBe(0);
  });
  it('ranks ties equally and does not mutate input', () => {
    const list = [{id:'a',name:'A',score:2},{id:'b',name:'B',score:5},{id:'c',name:'C',score:5}];
    expect(rank(list).map(p=>p.rank)).toEqual([1,1,3]); expect(list[0].id).toBe('a');
  });
  it('enforces progression', () => {
    expect(nextPhase('lobby',-1,3)).toBe('question'); expect(nextPhase('reveal',0,3)).toBe('leaderboard');
    expect(nextPhase('leaderboard',2,3)).toBe('finished'); expect(()=>nextPhase('question',0,3)).toThrow();
  });
  it('has playable original seed questions', () => {
    expect(seedQuiz.questions.length).toBe(3);
    for (const q of seedQuiz.questions) expect(q.options[q.correctIndex]).toBeTruthy();
  });
});
