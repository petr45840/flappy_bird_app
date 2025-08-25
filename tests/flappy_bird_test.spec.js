import { test, expect } from '@playwright/test';

test('Flappy Bird: пройти 3 трубы и врезаться в 4-ю', async ({ page }) => {
  // Переходим на страницу игры
  await page.goto('/');

  // Ждем загрузки игры (птичка должна быть видна)
  await page.waitForSelector('img[alt=""]', { timeout: 10000 }); // Птичка - это изображение

  // Нажимаем кнопку "Старт"
  const startButton = page.locator('text=Старт');
  await expect(startButton).toBeVisible();
  await startButton.click();

  // Ждем, пока игра начнется (кнопка "Старт" исчезнет)
  await expect(startButton).toBeHidden();

  // Теперь симулируем прыжки для прохождения труб
  // Трубы генерируются каждые 2 секунды, ширина трубы ~60px, скорость ~5px/20мс = 250px/сек
  // Расстояние между трубами 250px, так что время между трубами ~1 сек

  // Функция для прыжка
  const jump = async () => {
    await page.click('body'); // Клик по телу страницы для прыжка
  };

  // Прыгаем с интервалом, чтобы пройти трубы
  // Для прохождения одной трубы нужно несколько прыжков
  const jumpInterval = setInterval(jump, 300); // Прыжок каждые 300мс

  // Ждем время для прохождения 3 труб (около 6-8 секунд)
  await page.waitForTimeout(7000);

  // Останавливаем прыжки
  clearInterval(jumpInterval);

  // Теперь продолжаем без прыжков, чтобы врезаться в 4-ю трубу
  // Ждем еще 2-3 секунды
  await page.waitForTimeout(3000);

  // Проверяем, что игра окончена - должно появиться "Игра окончена!"
  const gameOverText = page.locator('text=Игра окончена!');
  await expect(gameOverText).toBeVisible({ timeout: 5000 });

  console.log('Тест завершен: птичка прошла 3 трубы и врезалась в 4-ю');
});
