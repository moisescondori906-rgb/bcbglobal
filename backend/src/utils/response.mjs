/**
 * Utilidad para respuestas estandarizadas
 */
export const response = {
  success: (res, data = {}, message = 'Operación exitosa', status = 200) => {
    return res.status(status).json({
      success: true,
      message,
      data
    });
  },

  error: (res, message = 'Error interno del servidor', status = 500, error = null) => {
    const responseBody = {
      success: false,
      message,
    };

    // En producción, solo enviamos detalles si es un error controlado (no 500)
    // o si el mensaje es explícito para el usuario.
    if (error && (process.env.NODE_ENV === 'development' || status < 500)) {
      responseBody.error = error.message || error;
      if (process.env.NODE_ENV === 'development') {
        responseBody.stack = error.stack;
      }
    }

    return res.status(status).json(responseBody);
  }
};
