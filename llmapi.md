Perfeito! Aqui está um exemplo de arquivo Markdown (`API_USAGE.md`) para documentar como usar a sua API TinyLlama:

```markdown
# TinyLlama API

Este documento descreve como utilizar a API do **TinyLlama**, um modelo de linguagem local, hospedado no seu servidor.

---

## Endereço da API

```

[http://homelab.op:10650/](http://homelab.op:10650/)

````

Método suportado: `POST`  
Conteúdo: JSON  
Resposta: JSON

---

## Estrutura da Requisição

A requisição deve conter um JSON com o formato:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Sua pergunta aqui"
    }
  ],
  "max_tokens": 100
}
````

### Parâmetros

| Parâmetro        | Tipo   | Descrição                                                              |
| ---------------- | ------ | ---------------------------------------------------------------------- |
| messages         | array  | Lista de mensagens no chat. Cada mensagem deve ter `role` e `content`. |
| messages.role    | string | `user` ou `system` (ou `assistant` em respostas internas).             |
| messages.content | string | Texto da mensagem.                                                     |
| max_tokens       | int    | Número máximo de tokens a serem gerados na resposta.                   |

---

## Exemplo com `curl`

```bash
curl -s -X POST "http://homelab.op:10650/" \
  -H "Content-Type: application/json" \
  -d '{
    "messages":[{"role":"user","content":"Olá, como você está?"}],
    "max_tokens":100
  }' \
| jq -r '.choices[0].message.content' \
| sed 's/<|user|>//g; s/<|assistant|>//g'
```

* O comando `jq` extrai apenas o conteúdo da resposta.
* O `sed` remove os tokens do template `<|user|>` e `<|assistant|>`.

---

## Exemplo em Python

```python
import requests
import re

url = "http://homelab.op:10650/"
data = {
    "messages": [{"role": "user", "content": "Olá, como você está?"}],
    "max_tokens": 100
}

resp = requests.post(url, json=data).json()
text = resp["choices"][0]["message"]["content"]

# Limpa tokens do template
clean_text = re.sub(r'<\|user\|>|<\|assistant\|>', '', text).strip()
print(clean_text)
```

---

## Observações

* A API retorna um JSON seguindo o formato do **OpenAI Chat API**, mas local.
* As respostas podem conter tokens de template (`<|user|>`, `<|assistant|>`), que devem ser removidos se quiser texto limpo.
* Ajuste `max_tokens` de acordo com a quantidade de texto que deseja gerar.

---

## Contato / Suporte

Para dúvidas ou problemas, abra uma issue no repositório ou entre em contato com o administrador do servidor.

```

---

Se você quiser, posso fazer uma **versão ainda mais enxuta**, tipo “uma página rápida de referência” com só `curl` + exemplos limpos, ideal para colocar no README.  

Quer que eu faça?
```
