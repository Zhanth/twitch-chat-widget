import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';


const HXTRank = ({ rankInfo} ) => {
    if (!rankInfo) return null;
  
    const { username, rank, lp, games, winrate } = rankInfo;

    const getRankColor = (rankText) => {
        const rankLower = rankText.toLowerCase();
        if (rankLower.includes('hierro')) return '#524748';
        if (rankLower.includes('bronce')) return '#8c4f3a';
        if (rankLower.includes('plata')) return '#7f989d';
        if (rankLower.includes('oro')) return '#cd8836';
        if (rankLower.includes('platino')) return '#26abd6';
        if (rankLower.includes('esmeralda')) return '#0f9c3a';
        if (rankLower.includes('diamante')) return '#8241eb';
        if (rankLower.includes('maestro')) return '#9f3fcc';
        if (rankLower.includes('gran maestro')) return '#cd4545';
        if (rankLower.includes('retador')) return '#f4c874';
        return '#ffffff'; // Color por defecto
      };

    return (
        <div className={`p-2 flex flex-row items-center gap-2 rounded-lg`} style={{ backgroundColor: getRankColor(rank) }}>
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