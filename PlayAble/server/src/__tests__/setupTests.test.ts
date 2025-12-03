describe('setupTests.js', () => {
  it('loads without errors', () => {
    expect(() => require('../setupTests.js')).not.toThrow();
  });
});
