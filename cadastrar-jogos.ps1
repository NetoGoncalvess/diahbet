# Script para cadastrar os jogos da Copa 2026 de uma vez no DiahBet
# Horarios ja convertidos para o fuso de Manaus (1h atras de Brasilia)
# Rode isso no PowerShell (na sua maquina, nao precisa estar na pasta do projeto)

$baseUrl = "https://diahbet.onrender.com/api/jogos"

$jogos = @(
    @{ time_casa = "México";        time_fora = "Equador";              fase = "16-avos de final"; data_jogo = "2026-06-30T12:00:00" },
    @{ time_casa = "Inglaterra";     time_fora = "RD Congo";             fase = "16-avos de final"; data_jogo = "2026-07-01T11:00:00" },
    @{ time_casa = "Bélgica";        time_fora = "Senegal";              fase = "16-avos de final"; data_jogo = "2026-07-01T15:00:00" },
    @{ time_casa = "Estados Unidos"; time_fora = "Bósnia e Herzegovina"; fase = "16-avos de final"; data_jogo = "2026-07-01T19:00:00" },
    @{ time_casa = "Espanha";        time_fora = "Áustria";              fase = "16-avos de final"; data_jogo = "2026-07-02T14:00:00" },
    @{ time_casa = "Portugal";       time_fora = "Croácia";              fase = "16-avos de final"; data_jogo = "2026-07-02T18:00:00" },
    @{ time_casa = "Suíça";          time_fora = "Argélia";              fase = "16-avos de final"; data_jogo = "2026-07-02T22:00:00" },
    @{ time_casa = "Austrália";      time_fora = "Egito";                fase = "16-avos de final"; data_jogo = "2026-07-03T13:00:00" },
    @{ time_casa = "Argentina";      time_fora = "Cabo Verde";           fase = "16-avos de final"; data_jogo = "2026-07-03T17:00:00" },
    @{ time_casa = "Colômbia";       time_fora = "Gana";                 fase = "16-avos de final"; data_jogo = "2026-07-03T20:30:00" }
)

foreach ($jogo in $jogos) {
    try {
        $body = $jogo | ConvertTo-Json
        $resultado = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $body -ContentType "application/json; charset=utf-8"
        Write-Host "Cadastrado: $($jogo.time_casa) x $($jogo.time_fora)" -ForegroundColor Green
    } catch {
        Write-Host "Erro ao cadastrar $($jogo.time_casa) x $($jogo.time_fora): $_" -ForegroundColor Red
    }
}

Write-Host "`nConcluido! Confere em https://diahbet.onrender.com" -ForegroundColor Cyan
