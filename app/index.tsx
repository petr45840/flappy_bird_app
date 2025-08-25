import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Text,
  Image
} from 'react-native';

const { width, height } = Dimensions.get('window');

const PIPE_WIDTH = 60;
const PIPE_SPACING = 250;
const BIRD_SIZE = 40;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const GAP_HEIGHT = 150; // высота щели между трубами

const FlappyBird = () => {
  const [gameOver, setGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const birdPosition = useRef(height / 2);
  const birdAnim = useRef(new Animated.Value(height / 2)).current;
  const [pipes, setPipes] = useState<{ id: number; x: number; gapY: number }[]>([]);
  const velocity = useRef(0);

  const resetGame = () => {
    setGameOver(false);
    birdPosition.current = height / 2;
    birdAnim.setValue(height / 2);
    velocity.current = 0;
    setPipes([]);
  };

  useEffect(() => {
    if (!isGameStarted) return;

    let gameOverRef = gameOver; // Используем ref для текущего состояния

    // Генерация труб каждые 2 сек
    const pipeInterval = setInterval(() => {
      console.log('Проверка генерации трубы: gameOver =', gameOverRef, 'isGameStarted =', isGameStarted);
      if (!gameOverRef) {
        const newPipe = {
          id: Date.now(),
          x: width,
          gapY: Math.floor(Math.random() * (height - 300)) + 100
        };
        console.log('Новая труба создана:', newPipe);
        setPipes(prev => {
          const updated = [...prev, newPipe];
          console.log('Обновленный массив труб после добавления:', updated);
          return updated;
        });
      }
    }, 2000);

    // Движение труб
    const moveInterval = setInterval(() => {
      setPipes(prev => {
        const newPipes = prev
          .map(pipe => ({ ...pipe, x: pipe.x - 5 }))
          .filter(pipe => pipe.x > -PIPE_WIDTH);
        console.log('Трубы после движения:', newPipes);
        return newPipes;
      });
    }, 20);

    // Физика птицы
    const physicsInterval = setInterval(() => {
      if (gameOverRef) return;

      velocity.current += GRAVITY;
      const newPosition = birdPosition.current + velocity.current;

      // Столкновение с землей/потолком
      if (newPosition > height - BIRD_SIZE || newPosition < 0) {
        gameOverRef = true;
        setGameOver(true);
        return;
      }

      // Проверка столкновений с трубами - используем текущий state
      setPipes(currentPipes => {
        for (let pipe of currentPipes) {
          const birdX = width / 4;
          const birdY = newPosition;

          if (
            birdX + BIRD_SIZE > pipe.x && // правая часть птицы пересекает трубу
            birdX < pipe.x + PIPE_WIDTH   // левая часть ещё в трубе
          ) {
            if (
              birdY < pipe.gapY || // выше щели
              birdY + BIRD_SIZE > pipe.gapY + GAP_HEIGHT // ниже щели
            ) {
              gameOverRef = true;
              setGameOver(true);
              return currentPipes;
            }
          }
        }
        return currentPipes;
      });

      birdPosition.current = newPosition;
      birdAnim.setValue(newPosition);
    }, 20);

    return () => {
      clearInterval(pipeInterval);
      clearInterval(moveInterval);
      clearInterval(physicsInterval);
    };
  }, [isGameStarted]); // Убрали gameOver и pipes из зависимостей

  const handleJump = () => {
    if (gameOver) return;

    if (!isGameStarted) {
      setIsGameStarted(true);
      return;
    }

    velocity.current = JUMP_FORCE; // сбросить скорость вверх
    birdPosition.current += JUMP_FORCE;
    birdAnim.setValue(birdPosition.current);
  };

  return (
    <TouchableWithoutFeedback onPress={handleJump}>
      <View style={styles.container}>
        {/* Птица */}
        <Animated.Image
          source={require('@/assets/images/bird.png')}
          style={[
            styles.bird,
            {
              transform: [{ translateY: birdAnim }],
              left: width / 4,
            },
          ]}
        />

        {/* Трубы */}
        {pipes.map(pipe => {
          console.log('Рендерим трубу:', pipe);
          return (
            <View key={pipe.id}>
              {/* Верхняя труба */}
              <View
                style={[
                  styles.pipe,
                  {
                    height: pipe.gapY,
                    left: pipe.x,
                    top: 0,
                  },
                ]}
              />
              {/* Нижняя труба */}
              <View
                style={[
                  styles.pipe,
                  {
                    height: height - pipe.gapY - GAP_HEIGHT,
                    left: pipe.x,
                    bottom: 0,
                  },
                ]}
              />
            </View>
          );
        })}

        {/* Экран окончания игры */}
        {gameOver && (
          <View style={styles.overlay}>
            <View style={styles.gameOver}>
              <Text style={styles.gameOverText}>Игра окончена!</Text>
              <Text
                style={styles.restartText}
                onPress={() => {
                  resetGame();
                  setIsGameStarted(false);
                }}
              >
                Нажмите, чтобы начать заново
              </Text>
            </View>
          </View>
        )}

        {/* Экран старта */}
        {!isGameStarted && !gameOver && (
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                resetGame();
                setIsGameStarted(true);
              }}
            >
              <Text style={styles.startText}>Старт</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#70c5ce',
    overflow: 'hidden',
  },
  bird: {
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    position: 'absolute',
    resizeMode: 'contain',
  },
  pipe: {
    position: 'absolute',
    backgroundColor: 'darkgreen',
    borderColor: 'black',
    borderWidth: 2,
    width: PIPE_WIDTH,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOver: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  gameOverText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  restartText: {
    color: '#007AFF',
    fontSize: 18,
    marginTop: 10,
  },
  startButton: {
    backgroundColor: '#ffcc00',
    padding: 15,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 150,
  },
  startText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default FlappyBird;
