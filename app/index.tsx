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
const PIPE_HEIGHT = 500; // не используется напрямую
const PIPE_SPACING = 250;
const BIRD_SIZE = 40;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;

// Функция для логирования
const logEvent = (message: string) => {
  console.log(message);
};

const FlappyBird = () => {
  const [gameOver, setGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const birdPosition = useRef(height / 2);
  const birdAnim = useRef(new Animated.Value(height / 2)).current;
  const [pipes, setPipes] = useState<{ id: number; x: number; gapY: number }[]>([]);
  
  const resetGame = () => {
    logEvent('Game reset');
    setGameOver(false);
    birdPosition.current = height / 2;
    birdAnim.setValue(height / 2);
    setPipes([]);
  };
  
  useEffect(() => {
    if (!isGameStarted) return;

    // Генерация труб
    const pipeInterval = setInterval(() => {
      if (!gameOver) {
        const newPipe = { 
          id: Date.now(), 
          x: width, 
          gapY: Math.floor(Math.random() * (height - 300)) + 100 // отступ сверху и снизу
        };
        logEvent('New pipe generated: ' + JSON.stringify(newPipe));
        setPipes(prev => [...prev, newPipe]);
      }
    }, 2000);
    
    // Движение труб
    const moveInterval = setInterval(() => {
      setPipes(prev => {
        return prev
          .map(pipe => ({ ...pipe, x: pipe.x - 5 }))
          .filter(pipe => pipe.x > -PIPE_WIDTH);
      });
    }, 20);
    
    // Физика птицы
    let velocity = 0;
    const physicsInterval = setInterval(() => {
      if (gameOver) return;

      velocity += GRAVITY;
      const newPosition = birdPosition.current + velocity;
      
      // Проверка на столкновение с землей и потолком
      if (newPosition > height - BIRD_SIZE || newPosition < 0) {
        logEvent('Collision with ground or ceiling detected');
        setGameOver(true);
        return;
      }

      // Проверка столкновений с трубами
      for (let pipe of pipes) {
        if (
          width / 4 + BIRD_SIZE > pipe.x &&
          width / 4 < pipe.x + PIPE_WIDTH
        ) {
          // Птица в пределах X трубы
          if (
            newPosition < pipe.gapY || 
            newPosition + BIRD_SIZE > pipe.gapY + 150
          ) {
            logEvent('Collision with pipe detected');
            setGameOver(true);
            return;
          }
        }
      }
      
      birdPosition.current = newPosition;
      Animated.timing(birdAnim, {
        toValue: newPosition,
        duration: 0, // мгновенно
        useNativeDriver: false, // важно: top не работает с useNativeDriver: true
      }).start();
    }, 20);
    
    return () => {
      clearInterval(pipeInterval);
      clearInterval(moveInterval);
      clearInterval(physicsInterval);
    };
  }, [gameOver, isGameStarted, pipes]);

  const handleJump = () => {
    if (gameOver) return;
    
    if (!isGameStarted) {
      logEvent('Game started via jump');
      setIsGameStarted(true);
      return;
    }

    logEvent('Bird jump');
    const newPosition = birdPosition.current + JUMP_FORCE;
    birdPosition.current = newPosition;
    
    Animated.timing(birdAnim, {
      toValue: newPosition,
      duration: 100,
      useNativeDriver: false, // для top нужно false
    }).start();
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
        {pipes.map(pipe => (
          <View key={pipe.id}>
            {/* Верхняя труба */}
            <View style={[
              styles.pipe,
              {
                height: pipe.gapY,
                width: PIPE_WIDTH,
                left: pipe.x,
                top: 0,
                backgroundColor: '#73bf2e',
              }
            ]} />
            {/* Нижняя труба */}
            <View style={[
              styles.pipe,
              {
                height: height - pipe.gapY - 150,
                width: PIPE_WIDTH,
                left: pipe.x,
                bottom: 0,
                backgroundColor: '#73bf2e',
              }
            ]} />
          </View>
        ))}
        
        {/* Экран окончания игры */}
{gameOver && (
  <View style={styles.overlay}>
            <View style={styles.gameOver}>
              <Text style={styles.gameOverText}>Игра окончена!</Text>
              <Text style={styles.restartText} onPress={() => {
                logEvent('Game restarted');
                resetGame();
                setIsGameStarted(false);
              }}>
                Нажмите, чтобы начать заново
              </Text>
            </View>
          </View>
        )}

        {!isGameStarted && !gameOver && (
          <View style={styles.overlay}>
            <TouchableOpacity 
              style={styles.startButton} 
              onPress={() => {
                logEvent('Game started');
                resetGame();
                // Анимация птицы перед стартом
                const safeAmplitude = Math.min(10, height / 2 - 10);
                Animated.sequence([
                  Animated.timing(birdAnim, { toValue: height / 2 - safeAmplitude, duration: 200, useNativeDriver: false }),
                  Animated.timing(birdAnim, { toValue: height / 2 + safeAmplitude, duration: 200, useNativeDriver: false }),
                  Animated.timing(birdAnim, { toValue: height / 2, duration: 200, useNativeDriver: false }),
                ]).start(() => {
                  setIsGameStarted(true);
                });
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
  },
  bird: {
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    position: 'absolute',
    resizeMode: 'contain',
  },
  pipe: {
    position: 'absolute',
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
