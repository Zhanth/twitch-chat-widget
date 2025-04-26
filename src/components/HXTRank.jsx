import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';


const HXTRank = ({ rankInfo} ) => {
    if (!rankInfo) return null;
  
    const { username, rank, lp, games, winrate } = rankInfo;

    const getRankColor = (rankText) => {
        const rankLower = rankText.toLowerCase();
        if (rankLower.includes('hierro')) return '#6e6e6e';
        if (rankLower.includes('bronce')) return '#cd7f32';
        if (rankLower.includes('plata')) return '#c0c0c0';
        if (rankLower.includes('oro')) return '#ffd700';
        if (rankLower.includes('platino')) return '#00ffbf';
        if (rankLower.includes('diamante')) return '#b9f2ff';
        if (rankLower.includes('maestro')) return '#9370db';
        if (rankLower.includes('gran maestro')) return '#ff4500';
        if (rankLower.includes('retador')) return '#00bfff';
        return '#ffffff'; // Color por defecto
      };

    return (
        <div className=''>
            {rank} 
            <span style={{ color: getRankColor(rank) }}>
                {username}
            </span>
            <span style={{ color: getRankColor(rank) }}>
                {lp} LP
            </span>
            <span style={{ color: getRankColor(rank) }}>
                {games} J
            </span>
            <span style={{ color: getRankColor(rank) }}>
                {winrate}%
            </span>
        </div>
    )
}

export default HXTRank;