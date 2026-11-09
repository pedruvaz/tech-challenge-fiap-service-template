import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it('extrai a mensagem de Error e converte o resto para string', () => {
    expect(errorMessage(new Error('x'))).toBe('x');
    expect(errorMessage('y')).toBe('y');
  });
});
