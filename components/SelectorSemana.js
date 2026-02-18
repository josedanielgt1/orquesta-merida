"use client"

import { useState, useEffect } from 'react';
import { obtenerInicioSemana, formatearSemana, formatearFecha } from '@/utils/fechas';

export default function SelectorSemana({ semanaActual, onCambiarSemana }) {
  const [mostrarCalendario, setMostrarCalendario] = useState(true); // Mostrar por defecto
  const [mesVista, setMesVista] = useState(new Date());

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Generar todas las semanas del mes
  const obtenerSemanasDelMes = (fecha) => {
    const semanas = [];
    const año = fecha.getFullYear();
    const mes = fecha.getMonth();
    
    // Primer día del mes
    let actual = new Date(año, mes, 1);
    // Ajustar al lunes de esa semana
    actual = obtenerInicioSemana(actual);
    
    // Último día del mes
    const ultimoDia = new Date(año, mes + 1, 0);
    
    // Generar semanas hasta pasar el último día del mes
    while (actual <= ultimoDia || semanas.length < 5) {
      const fin = new Date(actual);
      fin.setDate(fin.getDate() + 6);
      
      semanas.push({
        inicio: new Date(actual),
        fin: fin,
        label: formatearSemana(actual),
        inicioStr: formatearFecha(actual),
        esSemanaActual: formatearSemana(actual) === formatearSemana(semanaActual)
      });
      
      actual.setDate(actual.getDate() + 7);
      
      // Si ya pasamos el mes siguiente, parar
      if (actual.getMonth() > mes + 1) break;
    }
    
    return semanas;
  };

  const semanaAnterior = () => {
    const nueva = new Date(semanaActual);
    nueva.setDate(nueva.getDate() - 7);
    onCambiarSemana(nueva);
  };

  const semanaSiguiente = () => {
    const nueva = new Date(semanaActual);
    nueva.setDate(nueva.getDate() + 7);
    onCambiarSemana(nueva);
  };

  const semanaHoy = () => {
    onCambiarSemana(new Date());
  };

  const mesAnterior = () => {
    const nuevo = new Date(mesVista);
    nuevo.setMonth(nuevo.getMonth() - 1);
    setMesVista(nuevo);
  };

  const mesSiguiente = () => {
    const nuevo = new Date(mesVista);
    nuevo.setMonth(nuevo.getMonth() + 1);
    setMesVista(nuevo);
  };

  const semanasDelMes = obtenerSemanasDelMes(mesVista);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8 text-gray-900">
      {/* Header con navegación rápida */}
      <div className="flex items-center justify-between mb-6 text-gray-900">
        <h2 className="text-2xl font-bold text-gray-900">Seleccionar Semana</h2>
        <div className="flex gap-2">
          <button
            onClick={semanaAnterior}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            ← Semana anterior
          </button>
          <button
            onClick={semanaHoy}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Hoy
          </button>
          <button
            onClick={semanaSiguiente}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Semana siguiente →
          </button>
        </div>
      </div>

      {/* Semana actual seleccionada */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center text-gray-900">
        <p className="text-sm text-gray-600 mb-1">Semana seleccionada:</p>
        <p className="text-2xl font-bold text-blue-900">
          {formatearSemana(semanaActual)}
        </p>
      </div>

      {/* Calendario mensual */}
      <div>
        {/* Navegación de meses */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={mesAnterior}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-semibold"
          >
            ← {meses[(mesVista.getMonth() - 1 + 12) % 12]}
          </button>

          <h3 className="text-xl font-bold text-gray-900">
            {meses[mesVista.getMonth()]} {mesVista.getFullYear()}
          </h3>

          <button
            onClick={mesSiguiente}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-semibold"
          >
            {meses[(mesVista.getMonth() + 1) % 12]} →
          </button>
        </div>

        {/* Grid de semanas */}
        <div className="space-y-2">
          {semanasDelMes.map((semana, idx) => {
            const esSeleccionada = semana.esSemanaActual;
            const esHoy = formatearSemana(new Date()) === semana.label;
            
            return (
              <button
                key={idx}
                onClick={() => {
                  onCambiarSemana(semana.inicio);
                }}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  esSeleccionada
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : esHoy
                    ? 'bg-green-100 hover:bg-green-200 border-2 border-green-500'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-semibold ${esSeleccionada ? 'text-white' : 'text-gray-900'}`}>
                      Semana {idx + 1}
                    </span>
                    {esHoy && !esSeleccionada && (
                      <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
                        ESTA SEMANA
                      </span>
                    )}
                  </div>
                  <span className={`text-sm ${esSeleccionada ? 'text-blue-100' : 'text-gray-600'}`}>
                    {semana.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Ayuda */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          💡 Click en una semana para seleccionarla y ver sus solicitudes
        </div>
      </div>
    </div>
  );
}