// Sample data for the mockups. Money and Career come from the PRD; Health and Mental are placeholders.
window.DATA = [
  { id: 'career', name: 'Career', dir: 'up', goals: [
    { id: 'avenue', name: 'Find my focus avenue', steps: [
      { t: 'List the avenues in my field', done: true },
      { t: 'Shortlist 3 and research each', tasks: [
        { t: 'Read 2 job posts for each avenue' }, { t: 'Note pay, demand and what I enjoy' }, { t: 'Rank the three' }] },
      { t: 'Talk to 2 people in each' },
      { t: 'Pick one, plan 90 days' }] }] },

  { id: 'money', name: 'Money', dir: 'down', goals: [
    { id: '100k', name: 'Make KES 100,000', target: { of: 100000, by: 'Oct 2027' }, paths: [
      { id: 'remote', name: 'Remote work', earned: 12000, steps: [
        { t: 'Pick a niche', done: true },
        { t: 'Build profile & samples', done: true },
        { t: 'Apply to 5 gigs a week', tasks: [
          { t: 'Shortlist 5 gigs', done: true }, { t: 'Write the proposals' }, { t: 'Send and log them' }] },
        { t: 'Land first client' },
        { t: 'Earn KES 20,000 a month' }] },
      { id: 'trading', name: 'Trading', earned: 0, steps: [
        { t: 'Backtest 100 trades', tasks: [
          { t: 'Trades 1 to 40', done: true }, { t: 'Trades 41 to 70' }, { t: 'Trades 71 to 100' }] },
        { t: '30 days of chart study' },
        { t: 'Deposit & go live', fund: { need: 20000, sources: [
          { from: 'Remote work', amount: 8000 }, { from: 'Other cash: gift', amount: 4000 }] } },
        { t: 'First profitable month' }] }] }] },

  { id: 'health', name: 'Health', dir: 'right', goals: [
    { id: 'run', name: 'Run 5 km', steps: [
      { t: 'Run 1 km without stopping', done: true },
      { t: 'Run 3 km', tasks: [{ t: 'Three runs this week' }, { t: 'One long slow run' }] },
      { t: 'Run 5 km' }] }] },

  { id: 'mental', name: 'Mental', dir: 'left', goals: [] },
];
