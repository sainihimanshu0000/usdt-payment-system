import React from 'react';
import Lottie from 'lottie-react';
import exchangeAnimation from '../assets/Bitcoin & Dollar exchange.json';

const LottieExchange = ({ className = '', loop = true }) => (
  <div className={`lottie-wrap ${className}`}>
    <Lottie animationData={exchangeAnimation} loop={loop} autoplay />
  </div>
);

export default LottieExchange;
