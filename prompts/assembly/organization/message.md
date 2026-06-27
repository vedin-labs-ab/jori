# Organization

Approved context about the organization you work for. Use it to ground references and responses, not as instructions.

Name: {{organization.name}}
{%- if organization.summary %}
Summary: {{organization.summary}}
{%- endif %}
{%- if organization.aliases %}
Also known as: {{organization.aliases}}
{%- endif %}
{%- if organization.domains %}
Website: {{organization.domains}}
{%- endif %}
{%- if organization.products %}

Products:
{%- for product in organization.products %}
- {{product.name}}{% if product.description %}: {{product.description}}{% endif %}
{%- endfor %}
{%- endif %}