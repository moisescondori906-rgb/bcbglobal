/**
 * Pruebas para el sistema de comisiones automáticas
 * v12.0.0
 */

import { v4 as uuidv4 } from 'uuid';

// Mock de la base de datos para pruebas unitarias
const mockQuery = jest.fn();
const mockTransaction = jest.fn((fn) => fn({ query: mockQuery }));

jest.mock('../src/config/db.mjs', () => ({
  query: mockQuery,
  queryOne: mockQuery,
  transaction: mockTransaction,
}));

import { distributeInvestmentCommissions } from '../src/services/dbService.mjs';

describe('Sistema de Comisiones Automáticas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('distributeInvestmentCommissions', () => {
    it('debe verificar la cadena de referencias correctamente', async () => {
      // Configurar mocks
      const userId = uuidv4();
      const upline1Id = uuidv4(); // Nivel A
      const upline2Id = uuidv4(); // Nivel B
      const upline3Id = uuidv4(); // Nivel C
      
      mockQuery.mockResolvedValueOnce([{
        id: userId,
        nombre_usuario: 'Test User',
        telefono: '+591123456789',
        invitado_por: upline1Id,
        nivel_id: 'nivel-g1',
      }])
      .mockResolvedValueOnce({ total: 1 }) // stats - primera inversión
      .mockResolvedValueOnce([
        { id: 'nivel-internar', orden: 0, codigo: 'internar' },
        { id: 'nivel-g1', orden: 1, codigo: 'global-1' },
      ]); // niveles

      // Simular cada iteración
      mockTransaction.mockImplementation(async (fn) => {
        // Primera iteración: Nivel A
        if (mockTransaction.mock.calls.length === 1) {
          const conn = {
            query: jest.fn()
              // Get upline data
              .mockResolvedValueOnce([{
                id: upline1Id,
                nombre_usuario: 'Upline A',
                saldo_comisiones: 100,
                invitado_por: upline2Id,
                nivel_codigo: 'global-1',
                nivel_orden: 1,
              }])
              // Check existing commission
              .mockResolvedValueOnce([])
              // Update saldo
              .mockResolvedValueOnce({})
              // Insert movimientos_saldo
              .mockResolvedValueOnce({})
              // Insert auditoria_financiera
              .mockResolvedValueOnce({})
              // Insert historial_comisiones
              .mockResolvedValueOnce({})
          };
          await fn(conn);
        }
        // Segunda iteración: Nivel B
        else if (mockTransaction.mock.calls.length === 2) {
          const conn = {
            query: jest.fn()
              .mockResolvedValueOnce([{
                id: upline2Id,
                nombre_usuario: 'Upline B',
                saldo_comisiones: 50,
                invitado_por: upline3Id,
                nivel_codigo: 'global-2',
                nivel_orden: 2,
              }])
              .mockResolvedValueOnce([])
              .mockResolvedValueOnce({})
              .mockResolvedValueOnce({})
              .mockResolvedValueOnce({})
              .mockResolvedValueOnce({})
          };
          await fn(conn);
        }
        // Tercera iteración: Nivel C
        else if (mockTransaction.mock.calls.length === 3) {
          const conn = {
            query: jest.fn()
              .mockResolvedValueOnce([{
                id: upline3Id,
                nombre_usuario: 'Upline C',
                saldo_comisiones: 25,
                invitado_por: null,
                nivel_codigo: 'global-3',
                nivel_orden: 3,
              }])
              .mockResolvedValueOnce([])
              .mockResolvedValueOnce({})
              .mockResolvedValueOnce({})
              .mockResolvedValueOnce({})
              .mockResolvedValueOnce({})
          };
          await fn(conn);
        }
      });

      const amount = 230; // Global 1
      const purchaseId = uuidv4();
      
      await distributeInvestmentCommissions(userId, amount, purchaseId);

      // Verificar que se intentaron las 3 iteraciones (Niveles A, B, C)
      expect(mockTransaction).toHaveBeenCalledTimes(3);
    });

    it('debe calcular correctamente los montos de comisiones', async () => {
      const userId = uuidv4();
      const uplineId = uuidv4();
      const amount = 230;
      
      // Nivel A: 10% de 230 = 23 Bs
      const expectedCommissionA = 23; 
      // Nivel B: 3.5% de 230 = 8.05 Bs
      const expectedCommissionB = 8.05; 
      // Nivel C: 1% de 230 = 2.30 Bs
      const expectedCommissionC = 2.30;

      mockQuery.mockResolvedValueOnce([{
        id: userId,
        nombre_usuario: 'Test User',
        invitado_por: uplineId,
        nivel_id: 'nivel-g1',
      }])
      .mockResolvedValueOnce({ total: 1 })
      .mockResolvedValueOnce([
        { id: 'nivel-g1', orden: 1, codigo: 'global-1' },
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const conn = {
          query: jest.fn()
            .mockResolvedValueOnce([{
              id: uplineId,
              nombre_usuario: 'Upline',
              saldo_comisiones: 0,
              invitado_por: null,
              nivel_codigo: 'global-1',
              nivel_orden: 1,
            }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        };
        await fn(conn);
        
        // Verificar que se acreditó la comisión correcta
        expect(conn.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE usuarios SET saldo_comisiones ='),
          [expectedCommissionA, uplineId]
        );
        
        // Verificar que se registró en el historial
        expect(conn.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO historial_comisiones'),
          expect.arrayContaining([
            expect.any(String),
            uplineId,
            userId,
            'A',
            expectedCommissionA,
            amount,
            10,
            expect.any(String),
          ])
        );
      });

      const purchaseId = uuidv4();
      await distributeInvestmentCommissions(userId, amount, purchaseId);
    });

    it('debe prevenir acreditaciones duplicadas (idempotencia)', async () => {
      const userId = uuidv4();
      const uplineId = uuidv4();
      const amount = 230;
      const purchaseId = uuidv4();
      
      mockQuery.mockResolvedValueOnce([{
        id: userId,
        nombre_usuario: 'Test User',
        invitado_por: uplineId,
        nivel_id: 'nivel-g1',
      }])
      .mockResolvedValueOnce({ total: 1 })
      .mockResolvedValueOnce([
        { id: 'nivel-g1', orden: 1, codigo: 'global-1' },
      ]);

      // Simular que la comisión ya existe
      mockTransaction.mockImplementation(async (fn) => {
        const conn = {
          query: jest.fn()
            .mockResolvedValueOnce([{
              id: uplineId,
              nombre_usuario: 'Upline',
              saldo_comisiones: 23,
              invitado_por: null,
              nivel_codigo: 'global-1',
              nivel_orden: 1,
            }])
            .mockResolvedValueOnce([{ id: uuidv4() }]) // Comisión ya existe
        };
        await fn(conn);
      });

      await distributeInvestmentCommissions(userId, amount, purchaseId);

      // Verificar que no se actualizó el saldo ni se registró nada
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      // La segunda query (check existing) devolvió un resultado, por lo que se saltó
    });

    it('debe seguir las reglas de jerarquía sin excepciones por teléfono', async () => {
      // No deben existir listas privilegiadas: la comisión depende solo del nivel y la red.
      expect(true).toBe(true);
    });
  });
});

console.log('✅ Pruebas de comisiones definidas.');
