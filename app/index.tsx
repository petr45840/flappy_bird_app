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
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const PIPE_WIDTH = 60;
const PIPE_SPACING = 250;
const BIRD_SIZE = 40;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const GAP_HEIGHT = 250; // высота щели между трубами (увеличена для облегчения пролета)

const FlappyBird = () => {
 const [gameOver, setGameOver] = useState(false);
 const [isGameStarted, setIsGameStarted] = useState(false);
 const [score, setScore] = useState(0); // Добавляем счетчик очков
 const [highScore, setHighScore] = useState(0); // Рекорд
 const birdPosition = useRef(height / 2);
 const birdAnim = useRef(new Animated.Value(height / 2)).current;
 const [pipes, setPipes] = useState<{ id: number; x: number; gapY: number }[]>([]);
 const velocity = useRef(0);
 const passedPipes = useRef(new Set<number>()); // Для отслеживания пройденных труб

 // Функция загрузки рекорда
 const loadHighScore = async () => {
   try {
     const storedHighScore = await AsyncStorage.getItem('highScore');
     if (storedHighScore !== null) {
       setHighScore(parseInt(storedHighScore, 10));
     }
   } catch (error) {
     console.error('Ошибка загрузки рекорда:', error);
   }
 };

 // Функция сохранения рекорда
 const saveHighScore = async (newScore: number) => {
   try {
     await AsyncStorage.setItem('highScore', newScore.toString());
     setHighScore(newScore);
   } catch (error) {
     console.error('Ошибка сохранения рекорда:', error);
   }
 };

 // Загружаем рекорд при монтировании компонента
 useEffect(() => {
   loadHighScore();
 }, []);

 // Проверяем и сохраняем рекорд при окончании игры
 useEffect(() => {
   if (gameOver && score > highScore) {
     saveHighScore(score);
   }
 }, [gameOver, score, highScore]);

 const resetGame = () => {
   setGameOver(false);
   setScore(0);
   birdPosition.current = height / 2;
   birdAnim.setValue(height / 2);
   velocity.current = 0;
   setPipes([]);
   passedPipes.current.clear();
 };

 useEffect(() => {
   if (!isGameStarted) return;

   let gameOverRef = gameOver; // Используем ref для текущего состояния

   // Генерация труб каждые 2 сек
   const pipeInterval = setInterval(() => {
     console.log('Проверка генерации трубы: gameOver =', gameOverRef, 'isGameStarted =', isGameStarted);
     if (!gameOverRef) {
       const gapY = Math.floor(Math.random() * 120) + 30; // gapY от 30 до 150 для гарантированного пространства пролёта
       const newPipe = {
         id: Date.now(),
         x: width,
         gapY: gapY
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
         .filter(pipe => {
           if (pipe.x + PIPE_WIDTH < width / 4 && !passedPipes.current.has(pipe.id)) {
             // Птичка прошла трубу
             passedPipes.current.add(pipe.id);
             setScore(prevScore => prevScore + 1);
             console.log('Птичка прошла трубу, очки:', score + 1);
           }
           return pipe.x > -PIPE_WIDTH;
         });
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
       {/* Отображение очков и рекорда */}
       {isGameStarted && (
         <View style={styles.scoreContainer}>
           <Text style={styles.scoreText}>Очки: {score}</Text>
           <Text style={styles.highScoreText}>Рекорд: {highScore}</Text>
         </View>
       )}

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
                   top: pipe.gapY + GAP_HEIGHT,
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
 scoreText: {
   fontSize: 24,
   fontWeight: 'bold',
   color: 'white',
   textShadowColor: 'black',
   textShadowOffset: { width: 1, height: 1 },
   textShadowRadius: 2,
 },
 scoreContainer: {
   position: 'absolute',
   top: 50,
   left: width / 2 - 100,
   alignItems: 'center',
 },
 highScoreText: {
   fontSize: 18,
   fontWeight: 'bold',
   color: 'yellow',
   textShadowColor: 'black',
   textShadowOffset: { width: 1, height: 1 },
   textShadowRadius: 2,
   marginTop: 5,
 },
});

export default FlappyBird;
