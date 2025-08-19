import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Dimensions, Animated, TouchableWithoutFeedback, Text, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

const PIPE_WIDTH = 60;
const PIPE_HEIGHT = 500;
const PIPE_SPACING = 250;
const BIRD_SIZE = 40;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;

const FlappyBird = () => {
  const [gameOver, setGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const birdPosition = useRef(height / 2);
  const birdAnim = useRef(new Animated.Value(height / 2)).current;
  const [pipes, setPipes] = useState<{ id: number; x: number; gapY: number }[]>([]);
  
  const resetGame = () => {
    setGameOver(false);
    birdPosition.current = height / 2;
    birdAnim.setValue(height / 2);
    setPipes([]);
  };
  
  useEffect(() => {
    // Генерация труб
    const pipeInterval = setInterval(() => {
      if (!gameOver && isGameStarted) {
        setPipes(prev => [
          ...prev,
          { 
            id: Date.now(), 
            x: width, 
            gapY: Math.floor(Math.random() * (height - 200)) + 100 
          }
        ]);
      }
    }, 2000);
    
    // Движение труб
    const moveInterval = setInterval(() => {
      setPipes(prev => {
        const updated = prev.map(pipe => ({ ...pipe, x: pipe.x - 5 }));
        return isGameStarted ? updated.filter(pipe => pipe.x > -PIPE_WIDTH) : prev;
      });
    }, 20);
    
    // Физика птицы
    let velocity = 0;
    const physicsInterval = setInterval(() => {
      if (!gameOver && isGameStarted) {
        velocity += GRAVITY;
        const newPosition = birdPosition.current + velocity;
        
        // Проверка на столкновение с землей
        if (newPosition > height - BIRD_SIZE) {
          setGameOver(true);
          return;
        }
        
        // Проверка на столкновение с потолком
        if (newPosition < 0) {
          setGameOver(true);
          return;
        }
        
        // Проверка на столкновение с трубами
        pipes.forEach(pipe => {
          if (
            width / 4 > pipe.x && 
            width / 4 < pipe.x + PIPE_WIDTH &&
            (newPosition < pipe.gapY || newPosition > pipe.gapY + 150)
          ) {
            setGameOver(true);
          }
        });
        
        birdPosition.current = newPosition;
        birdAnim.setValue(newPosition);
      }
    }, 20);
    
    return () => {
      clearInterval(pipeInterval);
      clearInterval(moveInterval);
      clearInterval(physicsInterval);
    };
  }, [gameOver, isGameStarted]);
  
  const handleJump = () => {
    if (gameOver || !isGameStarted) return;
    birdPosition.current += JUMP_FORCE;
    Animated.timing(birdAnim, {
      toValue: birdPosition.current,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <TouchableWithoutFeedback onPress={handleJump}>
      <View style={styles.container}>
        {/* Птица */}
        <Image source={require('@/assets/images/react-logo.png')} style={[
          styles.bird,
          { 
            top: birdAnim,
            left: width / 4 
          }
        ]} />
        
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
                top: 0
              }
            ]} />
            {/* Нижняя труба */}
            <View style={[
              styles.pipe,
              {
                height: height - pipe.gapY - 150,
                width: PIPE_WIDTH,
                left: pipe.x,
                bottom: 0
              }
            ]} />
          </View>
        ))}
        
        {/* Экран окончания игры */}
        {gameOver && (
          <View style={styles.overlay}>
            <View style={styles.gameOver}>
              <Text style={styles.gameOverText}>Игра окончена!</Text>
              <Text style={styles.restartText} onPress={resetGame}>
                Нажмите, чтобы начать заново
              </Text>
            </View>
          </View>
        )}

        {!isGameStarted && !gameOver && (
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.startButton} onPress={() => {
              setIsGameStarted(true);
              resetGame();
            }}>
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
  },
  pipe: {
    backgroundColor: '#73bf2e',
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
  },
  startButton: {
    backgroundColor: '#ffcc00',
    padding: 15,
    borderRadius: 10,
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
