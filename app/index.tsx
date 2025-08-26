import React, { useState, useEffect, useRef } from 'react';
import {
 TouchableOpacity,
 View,
 StyleSheet,
 Dimensions,
 Animated,
 TouchableWithoutFeedback,
 Text,
 Image,
 TextInput,
 Platform
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
 const [userName, setUserName] = useState('');
 const [players, setPlayers] = useState<{ [key: string]: number }>({});
 const [showLeaderboard, setShowLeaderboard] = useState(false);
 const birdPosition = useRef(height / 2);
 const birdAnim = useRef(new Animated.Value(height / 2)).current;
 const [pipes, setPipes] = useState<{ id: number; x: number; gapY: number; gapHeight: number }[]>([]);
 const velocity = useRef(0);
 const passedPipes = useRef(new Set<number>()); // Для отслеживания пройденных труб

 // Функция загрузки игроков
 const loadPlayers = async () => {
   try {
     const storedPlayers = await AsyncStorage.getItem('players');
     if (storedPlayers !== null) {
       const playersData = JSON.parse(storedPlayers) as { [key: string]: number };
       setPlayers(playersData);
       // Найти глобальный рекорд
       const scores = Object.values(playersData);
       const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
       setHighScore(maxScore);
     }
   } catch (error) {
     console.error('Ошибка загрузки игроков:', error);
   }
 };

 // Функция сохранения игроков
 const savePlayers = async (newPlayers: { [key: string]: number }) => {
   try {
     await AsyncStorage.setItem('players', JSON.stringify(newPlayers));
     setPlayers(newPlayers);
     const scores = Object.values(newPlayers);
     const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
     setHighScore(maxScore);
   } catch (error) {
     console.error('Ошибка сохранения игроков:', error);
   }
 };

 // Загружаем игроков при монтировании компонента
 useEffect(() => {
   loadPlayers();
 }, []);

 // Проверяем и сохраняем рекорд при окончании игры
 useEffect(() => {
   if (gameOver && userName && score > 0) {
     const currentPlayerScore = players[userName] || 0;
     if (score > currentPlayerScore) {
       console.log(`Новый рекорд для ${userName}: ${score} (предыдущий: ${currentPlayerScore})`);
       const newPlayers = { ...players, [userName]: score };
       savePlayers(newPlayers);
     } else {
       console.log(`Рекорд не обновлен для ${userName}: текущий счет ${score}, рекорд ${currentPlayerScore}`);
     }
   }
 }, [gameOver, score, userName, players]);

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

   // Функция для генерации труб с разнообразием
   const generatePipe = () => {
     const gapY = Math.floor(Math.random() * 200) + 100; // gapY от 100 до 300 для большего разнообразия
     const gapHeight = Math.floor(Math.random() * 100) + 200; // gapHeight от 200 до 300 для переменной щели
     const newPipe = {
       id: Date.now(),
       x: width,
       gapY: gapY,
       gapHeight: gapHeight // Добавляем переменную высоту щели
     };
     setPipes(prev => [...prev, newPipe]);
   };

   // Генерация труб с переменным интервалом
   const scheduleNextPipe = () => {
     const interval = Math.random() * 1000 + 1500; // Интервал от 1.5 до 2.5 сек
     setTimeout(() => {
       if (!gameOverRef) {
         generatePipe();
         scheduleNextPipe(); // Рекурсивно планируем следующую
       }
     }, interval);
   };

   scheduleNextPipe(); // Начинаем генерацию

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
             birdY + BIRD_SIZE > pipe.gapY + pipe.gapHeight // ниже щели
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
     clearInterval(moveInterval);
     clearInterval(physicsInterval);
   };
 }, [isGameStarted]); // Убрали gameOver и pipes из зависимостей

 // Обработка клавиши пробел для прыжка (только на web)
 useEffect(() => {
   if (!isGameStarted || gameOver) return;

   const handleKeyDown = (event: any) => {
     if (event.code === 'Space') {
       event.preventDefault();
       handleJump();
     }
   };

   if (Platform.OS === 'web') {
     document.addEventListener('keydown', handleKeyDown);
     return () => {
       document.removeEventListener('keydown', handleKeyDown);
     };
   }
 }, [isGameStarted, gameOver]);

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
                 height: height - pipe.gapY - pipe.gapHeight,
                 left: pipe.x,
                 top: pipe.gapY + pipe.gapHeight,
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
           <Text style={styles.finalScoreText}>Ваш счет: {score}</Text>
           <TextInput
             style={styles.input}
             placeholder="Введите ваше имя"
             value={userName}
             onChangeText={setUserName}
             maxLength={20}
           />
           <TouchableOpacity
             style={[styles.saveButton, !userName.trim() && { opacity: 0.5 }]}
             onPress={() => {
               if (userName.trim()) {
                 // Сохраняем рекорд
                 const currentPlayerScore = players[userName] || 0;
                 if (score > currentPlayerScore) {
                   const newPlayers = { ...players, [userName]: score };
                   savePlayers(newPlayers);
                 }
                 // Сбрасываем игру
                 resetGame();
                 setIsGameStarted(false);
                 setUserName('');
               }
             }}
             disabled={!userName.trim()}
           >
             <Text style={styles.saveButtonText}>Сохранить рекорд</Text>
           </TouchableOpacity>
           <Text
             style={styles.restartText}
             onPress={() => {
               resetGame();
               setIsGameStarted(false);
               setUserName('');
             }}
           >
             Начать заново без сохранения
           </Text>
         </View>
       </View>
     )}

     {/* Экран старта */}
     {!isGameStarted && !gameOver && (
       <View style={styles.overlay}>
         <View style={styles.startScreen}>
           <Text style={styles.startTitle}>Flappy Bird</Text>
           <TouchableOpacity
             style={styles.startButton}
             onPress={() => {
               resetGame();
               setIsGameStarted(true);
             }}
           >
             <Text style={styles.startText}>Старт</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={styles.leaderboardButton}
             onPress={() => setShowLeaderboard(true)}
           >
             <Text style={styles.leaderboardText}>Таблица лидеров</Text>
           </TouchableOpacity>
         </View>
       </View>
     )}

     {/* Таблица лидеров */}
     {showLeaderboard && (
       <View style={styles.overlay}>
         <View style={styles.leaderboard}>
           <Text style={styles.leaderboardTitle}>Таблица лидеров</Text>
           <View style={styles.leaderboardList}>
             {Object.entries(players)
               .sort(([, a], [, b]) => b - a)
               .slice(0, 10)
               .map(([name, score], index) => (
                 <View key={name} style={styles.leaderboardItem}>
                   <Text style={styles.rankText}>{index + 1}.</Text>
                   <Text style={styles.nameText}>{name}</Text>
                   <Text style={styles.scoreText}>{score}</Text>
                 </View>
               ))}
           </View>
           <TouchableOpacity
             style={styles.closeButton}
             onPress={() => setShowLeaderboard(false)}
           >
             <Text style={styles.closeText}>Закрыть</Text>
           </TouchableOpacity>
         </View>
       </View>
     )}

     {/* Обработка касаний только во время игры */}
     {isGameStarted && !gameOver && (
       <TouchableWithoutFeedback onPress={handleJump}>
         <View style={StyleSheet.absoluteFillObject} />
       </TouchableWithoutFeedback>
     )}
   </View>
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
 startScreen: {
   backgroundColor: 'white',
   padding: 30,
   borderRadius: 20,
   alignItems: 'center',
   width: 300,
 },
 startTitle: {
   fontSize: 32,
   fontWeight: 'bold',
   color: '#333',
   marginBottom: 20,
 },
 input: {
   width: '100%',
   height: 40,
   borderColor: '#ccc',
   borderWidth: 1,
   borderRadius: 8,
   paddingHorizontal: 10,
   fontSize: 16,
   marginBottom: 20,
 },
 leaderboardButton: {
   marginTop: 10,
   padding: 10,
   backgroundColor: '#e0e0e0',
   borderRadius: 8,
 },
 leaderboardText: {
   fontSize: 16,
   color: '#333',
 },
 leaderboard: {
   backgroundColor: 'white',
   padding: 20,
   borderRadius: 10,
   alignItems: 'center',
   width: 300,
   maxHeight: height * 0.8,
 },
 leaderboardTitle: {
   fontSize: 24,
   fontWeight: 'bold',
   marginBottom: 20,
   color: '#333',
 },
 leaderboardList: {
   width: '100%',
   marginBottom: 20,
 },
 leaderboardItem: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   paddingVertical: 8,
   borderBottomWidth: 1,
   borderBottomColor: '#eee',
 },
 rankText: {
   fontSize: 18,
   fontWeight: 'bold',
   width: 30,
   textAlign: 'center',
 },
 nameText: {
   fontSize: 16,
   flex: 1,
   textAlign: 'left',
 },
 closeButton: {
   backgroundColor: '#007AFF',
   padding: 10,
   borderRadius: 8,
 },
 closeText: {
   color: 'white',
   fontSize: 16,
 },
 finalScoreText: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#333',
   marginBottom: 15,
 },
 saveButton: {
   backgroundColor: '#4CAF50',
   padding: 12,
   borderRadius: 8,
   alignItems: 'center',
   marginBottom: 10,
   minWidth: 200,
 },
 saveButtonText: {
   color: 'white',
   fontSize: 16,
   fontWeight: 'bold',
 },
});

export default FlappyBird;
