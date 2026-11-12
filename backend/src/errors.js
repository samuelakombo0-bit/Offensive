// Les erreurs applicatives gardent un code HTTP stable sans exposer de détails internes.
class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Cette fonction convertit les erreurs de validation en réponses explicites et cohérentes.
function parseInput(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, "INVALID_INPUT", result.error.issues[0]?.message || "Les données envoyées sont invalides.");
  }
  return result.data;
}

module.exports = { AppError, parseInput };
