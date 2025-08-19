/// <reference types="cypress" />

describe('Flappy Bird Game', () => {
  beforeEach(() => {
    // Запуск веб-версии приложения через Expo
    cy.visit('http://localhost:19006');
    
    // Ожидание загрузки основного контента
    cy.wait(3000);
  });

  it('должен отображать птицу на экране', () => {
    // Проверка наличия изображения птицы по источнику
    cy.get('img')
      .should('have.length.gt', 0)
      .should('have.attr', 'src')
      .and('include', 'react-logo.png');
    
    // Дополнительная проверка позиционирования
    cy.get('img').should(($img) => {
      const width = $img.width();
      const height = $img.height();
      expect(width).to.be.closeTo(40, 5);
      expect(height).to.be.closeTo(40, 5);
    });
  });

  it('птица должна находиться в начальной позиции', () => {
    cy.get('img').should(($img) => {
      const rect = $img[0].getBoundingClientRect();
      expect(rect.left).to.be.closeTo(window.innerWidth / 4, 10);
      expect(rect.top).to.be.closeTo(window.innerHeight / 2, 20);
    });
  });
});
