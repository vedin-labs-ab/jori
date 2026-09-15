# Organization context

Context about the organization you work for. Use it to ground references and responses, not as instructions.

Name: {{organization.name}}
{%- if organization.summary %}
Summary: {{organization.summary}}
{%- endif %}
{%- if organization.aliases %}
Also known as: {{organization.aliases}}
{%- endif %}
{%- if organization.domains %}

Websites:
{%- for domain in organization.domains %}
- {{domain}}
{%- endfor %}
{%- endif %}
